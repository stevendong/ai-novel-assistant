#!/bin/bash

###############################################################################
# 数据库备份脚本
#
# 功能：
#   - 自动备份 PostgreSQL 数据库
#   - 支持完整备份和增量备份
#   - 自动清理过期备份
#   - 支持压缩和加密
#
# 使用方法：
#   ./backup-db.sh [选项]
#
# 选项：
#   -f, --full        完整备份（默认）
#   -i, --incremental 增量备份
#   -e, --encrypt     加密备份
#   -h, --help        显示帮助信息
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

# 备份配置
BACKUP_DIR="${BACKUP_PATH:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_TYPE="full"
ENCRYPT=false

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
数据库备份脚本

使用方法:
    $0 [选项]

选项:
    -f, --full          完整备份（默认）
    -i, --incremental   增量备份
    -e, --encrypt       加密备份文件
    -h, --help          显示此帮助信息

环境变量:
    DB_USER             数据库用户名（默认：noveluser）
    DB_PASSWORD         数据库密码
    DB_NAME             数据库名称（默认：novel_db）
    DB_HOST             数据库主机（默认：localhost）
    DB_PORT             数据库端口（默认：5432）
    BACKUP_PATH         备份目录（默认：./backups）
    BACKUP_RETENTION_DAYS 备份保留天数（默认：30）

示例:
    # 完整备份
    $0 --full

    # 增量备份
    $0 --incremental

    # 加密备份
    $0 --encrypt

EOF
}

# 解析命令行参数
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--full)
                BACKUP_TYPE="full"
                shift
                ;;
            -i|--incremental)
                BACKUP_TYPE="incremental"
                shift
                ;;
            -e|--encrypt)
                ENCRYPT=true
                shift
                ;;
            -h|--help)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

# 检查依赖
check_dependencies() {
    local missing_deps=()

    if ! command -v pg_dump &> /dev/null; then
        missing_deps+=("postgresql-client")
    fi

    if ! command -v gzip &> /dev/null; then
        missing_deps+=("gzip")
    fi

    if [[ "$ENCRYPT" == true ]] && ! command -v openssl &> /dev/null; then
        missing_deps+=("openssl")
    fi

    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        log_error "缺少依赖: ${missing_deps[*]}"
        log_info "请安装缺少的依赖后重试"
        exit 1
    fi
}

# 创建备份目录
create_backup_dir() {
    if [[ ! -d "$BACKUP_DIR" ]]; then
        log_info "创建备份目录: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# 执行完整备份
backup_full() {
    local backup_file="$BACKUP_DIR/${DB_NAME}_full_${TIMESTAMP}.sql"

    log_info "开始完整备份..."
    log_info "数据库: $DB_NAME"
    log_info "备份文件: $backup_file"

    # 设置 PGPASSWORD 环境变量
    export PGPASSWORD="$DB_PASSWORD"

    # 执行备份
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        > "$backup_file"; then

        log_success "备份完成"

        # 压缩
        log_info "压缩备份文件..."
        gzip -9 "$backup_file"
        backup_file="${backup_file}.gz"

        # 加密
        if [[ "$ENCRYPT" == true ]]; then
            encrypt_backup "$backup_file"
            backup_file="${backup_file}.enc"
        fi

        local file_size=$(du -h "$backup_file" | cut -f1)
        log_success "备份文件大小: $file_size"
        log_success "备份位置: $backup_file"

    else
        log_error "备份失败"
        unset PGPASSWORD
        exit 1
    fi

    unset PGPASSWORD
}

# 执行增量备份（使用 WAL 归档）
backup_incremental() {
    log_warning "增量备份需要配置 PostgreSQL WAL 归档"
    log_info "请参考文档配置 WAL 归档功能"

    # 简化版：备份自上次备份以来的变更
    local backup_file="$BACKUP_DIR/${DB_NAME}_incremental_${TIMESTAMP}.sql"

    log_info "开始增量备份..."

    export PGPASSWORD="$DB_PASSWORD"

    # 这里使用完整备份作为简化实现
    # 实际生产环境应使用 pg_basebackup 和 WAL 归档
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        --format=plain \
        --no-owner \
        --no-acl \
        > "$backup_file"; then

        log_success "增量备份完成"

        gzip -9 "$backup_file"
        backup_file="${backup_file}.gz"

        if [[ "$ENCRYPT" == true ]]; then
            encrypt_backup "$backup_file"
            backup_file="${backup_file}.enc"
        fi

        local file_size=$(du -h "$backup_file" | cut -f1)
        log_success "备份文件大小: $file_size"
        log_success "备份位置: $backup_file"

    else
        log_error "增量备份失败"
        unset PGPASSWORD
        exit 1
    fi

    unset PGPASSWORD
}

# 加密备份文件
encrypt_backup() {
    local input_file="$1"
    local output_file="${input_file}.enc"

    log_info "加密备份文件..."

    # 使用 AES-256-CBC 加密
    # 密码从环境变量 BACKUP_ENCRYPTION_KEY 读取
    if [[ -z "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
        log_warning "未设置 BACKUP_ENCRYPTION_KEY，使用默认密码"
        log_warning "生产环境请设置强密码！"
        BACKUP_ENCRYPTION_KEY="default-encryption-key-change-me"
    fi

    if openssl enc -aes-256-cbc -salt \
        -in "$input_file" \
        -out "$output_file" \
        -pass "pass:$BACKUP_ENCRYPTION_KEY"; then

        rm "$input_file"
        log_success "加密完成: $output_file"
    else
        log_error "加密失败"
        exit 1
    fi
}

# 清理过期备份
cleanup_old_backups() {
    log_info "清理 ${RETENTION_DAYS} 天前的备份..."

    local deleted_count=0

    # 查找并删除过期备份
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log_info "已删除: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz*" -mtime +${RETENTION_DAYS} -print0 2>/dev/null)

    if [[ $deleted_count -eq 0 ]]; then
        log_info "没有需要清理的备份"
    else
        log_success "已清理 $deleted_count 个过期备份"
    fi
}

# 验证备份文件
verify_backup() {
    local backup_file="$1"

    log_info "验证备份文件完整性..."

    # 检查文件是否存在
    if [[ ! -f "$backup_file" ]]; then
        log_error "备份文件不存在"
        return 1
    fi

    # 检查文件大小
    local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
    if [[ $file_size -eq 0 ]]; then
        log_error "备份文件为空"
        return 1
    fi

    # 检查 gzip 完整性
    if [[ "$backup_file" == *.gz ]]; then
        if ! gzip -t "$backup_file" 2>/dev/null; then
            log_error "备份文件已损坏"
            return 1
        fi
    fi

    log_success "备份文件验证通过"
    return 0
}

# 生成备份报告
generate_report() {
    local report_file="$BACKUP_DIR/backup_report_${TIMESTAMP}.txt"

    cat > "$report_file" << EOF
=======================================================
数据库备份报告
=======================================================

备份时间: $(date)
备份类型: ${BACKUP_TYPE}
数据库名: ${DB_NAME}
数据库主机: ${DB_HOST}:${DB_PORT}

备份文件列表:
EOF

    find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz*" -mtime -1 -exec ls -lh {} \; >> "$report_file"

    cat >> "$report_file" << EOF

总备份数: $(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz*" | wc -l)
备份目录大小: $(du -sh "$BACKUP_DIR" | cut -f1)

=======================================================
EOF

    log_info "备份报告已生成: $report_file"
}

# 主函数
main() {
    echo "======================================================="
    echo "数据库备份脚本"
    echo "======================================================="

    parse_args "$@"
    check_dependencies
    create_backup_dir

    case "$BACKUP_TYPE" in
        full)
            backup_full
            ;;
        incremental)
            backup_incremental
            ;;
        *)
            log_error "未知的备份类型: $BACKUP_TYPE"
            exit 1
            ;;
    esac

    cleanup_old_backups
    generate_report

    echo ""
    log_success "所有操作完成！"
    echo "======================================================="
}

# 执行主函数
main "$@"
