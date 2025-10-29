#!/bin/bash

###############################################################################
# 数据库恢复脚本
#
# 功能：
#   - 从备份文件恢复 PostgreSQL 数据库
#   - 支持加密备份恢复
#   - 自动解压
#   - 安全确认机制
#
# 使用方法：
#   ./restore-db.sh <backup_file>
#
###############################################################################

set -euo pipefail

# 配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 从环境变量读取配置
DB_USER="${DB_USER:-noveluser}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-novel_db}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
数据库恢复脚本

使用方法:
    $0 <backup_file>

参数:
    backup_file    备份文件路径（支持 .sql, .sql.gz, .sql.gz.enc）

环境变量:
    DB_USER              数据库用户名（默认：noveluser）
    DB_PASSWORD          数据库密码
    DB_NAME              数据库名称（默认：novel_db）
    DB_HOST              数据库主机（默认：localhost）
    DB_PORT              数据库端口（默认：5432）
    BACKUP_ENCRYPTION_KEY 备份加密密钥（如果备份已加密）

示例:
    # 恢复普通备份
    $0 backups/novel_db_full_20240101_120000.sql.gz

    # 恢复加密备份
    BACKUP_ENCRYPTION_KEY="your-key" $0 backups/novel_db_full_20240101_120000.sql.gz.enc

EOF
}

# 检查参数
if [[ $# -eq 0 ]]; then
    log_error "缺少备份文件参数"
    show_help
    exit 1
fi

if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    exit 0
fi

BACKUP_FILE="$1"

# 检查备份文件是否存在
if [[ ! -f "$BACKUP_FILE" ]]; then
    log_error "备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 检查依赖
check_dependencies() {
    local missing_deps=()

    if ! command -v psql &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi

    if ! command -v gzip &> /dev/null; then
        missing_deps+=("gzip")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "缺少依赖: ${missing_deps[*]}"
        log_info "请安装缺少的依赖后重试"
        exit 1
    fi
}

# 确认操作
confirm_restore() {
    log_warning "=========================================="
    log_warning "警告：此操作将覆盖现有数据库！"
    log_warning "=========================================="
    log_info "数据库: $DB_NAME"
    log_info "主机: $DB_HOST:$DB_PORT"
    log_info "备份文件: $BACKUP_FILE"
    echo ""

    read -p "是否继续？(输入 'yes' 确认): " confirm

    if [[ "$confirm" != "yes" ]]; then
        log_info "操作已取消"
        exit 0
    fi
}

# 创建当前数据库备份
backup_current_db() {
    log_info "创建当前数据库备份（安全措施）..."

    local safety_backup="$PROJECT_ROOT/backups/safety_backup_before_restore_$(date +%Y%m%d_%H%M%S).sql.gz"
    mkdir -p "$(dirname "$safety_backup")"

    export PGPASSWORD="$DB_PASSWORD"

    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        | gzip -9 > "$safety_backup"; then

        log_success "安全备份已创建: $safety_backup"
    else
        log_warning "无法创建安全备份（数据库可能不存在）"
    fi

    unset PGPASSWORD
}

# 解密备份文件
decrypt_backup() {
    local encrypted_file="$1"
    local decrypted_file="${encrypted_file%.enc}"

    log_info "解密备份文件..."

    if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
        log_error "未设置 BACKUP_ENCRYPTION_KEY 环境变量"
        log_info "请设置加密密钥: export BACKUP_ENCRYPTION_KEY='your-key'"
        exit 1
    fi

    if openssl enc -aes-256-cbc -d -salt \
        -in "$encrypted_file" \
        -out "$decrypted_file" \
        -pass "pass:$BACKUP_ENCRYPTION_KEY"; then

        log_success "解密完成"
        echo "$decrypted_file"
    else
        log_error "解密失败（密钥可能不正确）"
        exit 1
    fi
}

# 解压备份文件
decompress_backup() {
    local compressed_file="$1"
    local decompressed_file="${compressed_file%.gz}"

    log_info "解压备份文件..."

    if gzip -dc "$compressed_file" > "$decompressed_file"; then
        log_success "解压完成"
        echo "$decompressed_file"
    else
        log_error "解压失败"
        exit 1
    fi
}

# 恢复数据库
restore_database() {
    local sql_file="$1"

    log_info "开始恢复数据库..."

    export PGPASSWORD="$DB_PASSWORD"

    # 终止所有活动连接
    log_info "终止现有数据库连接..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" \
        2>/dev/null || true

    # 删除并重建数据库
    log_info "重建数据库..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS \"$DB_NAME\";" \
        -c "CREATE DATABASE \"$DB_NAME\";"

    # 恢复数据
    log_info "恢复数据..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" < "$sql_file"; then
        log_success "数据库恢复完成"
    else
        log_error "数据库恢复失败"
        unset PGPASSWORD
        exit 1
    fi

    unset PGPASSWORD
}

# 验证恢复结果
verify_restore() {
    log_info "验证恢复结果..."

    export PGPASSWORD="$DB_PASSWORD"

    # 检查表数量
    local table_count=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

    log_info "表数量: $table_count"

    if [[ $table_count -gt 0 ]]; then
        log_success "数据库恢复验证通过"

        # 显示一些统计信息
        log_info "数据统计:"
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\x on
SELECT
    schemaname,
    COUNT(*) as table_count,
    pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as total_size
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;
EOF
    else
        log_error "数据库恢复验证失败"
        exit 1
    fi

    unset PGPASSWORD
}

# 清理临时文件
cleanup_temp_files() {
    local files=("$@")

    log_info "清理临时文件..."

    for file in "${files[@]}"; do
        if [[ -f "$file" ]] && [[ "$file" != "$BACKUP_FILE" ]]; then
            rm "$file"
            log_info "已删除: $file"
        fi
    done
}

# 主函数
main() {
    echo "======================================================="
    echo "数据库恢复脚本"
    echo "======================================================="

    check_dependencies
    confirm_restore
    backup_current_db

    local working_file="$BACKUP_FILE"
    local temp_files=()

    # 如果是加密文件，先解密
    if [[ "$working_file" == *.enc ]]; then
        working_file=$(decrypt_backup "$working_file")
        temp_files+=("$working_file")
    fi

    # 如果是压缩文件，解压
    if [[ "$working_file" == *.gz ]]; then
        working_file=$(decompress_backup "$working_file")
        temp_files+=("$working_file")
    fi

    # 恢复数据库
    restore_database "$working_file"

    # 验证恢复结果
    verify_restore

    # 清理临时文件
    cleanup_temp_files "${temp_files[@]}"

    echo ""
    log_success "数据库恢复完成！"
    echo "======================================================="
}

# 执行主函数
main
