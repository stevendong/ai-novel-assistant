const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function migrateToUserAuth() {
  const prisma = new PrismaClient()

  try {
    console.log('Starting user authentication migration...')

    console.log('Creating default admin user...')
    const hashedPassword = await bcrypt.hash('admin123', 12)

    const adminUser = await prisma.user.create({
      data: {
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        nickname: 'Administrator',
        isActive: true,
      },
    })

    console.log(`Admin user created with ID: ${adminUser.id}`)

    const existingNovels = await prisma.novel.findMany()
    console.log(`Found ${existingNovels.length} existing novels to migrate`)

    if (existingNovels.length > 0) {
      console.log('Updating existing novels to belong to admin user...')
      await prisma.novel.updateMany({
        data: {
          userId: adminUser.id,
        },
      })
      console.log('All novels updated successfully')
    }

    console.log('Migration completed successfully!')
    console.log('Default admin credentials:')
    console.log('  Username: admin')
    console.log('  Email: admin@example.com')
    console.log('  Password: admin123')
    console.log('Please change the default password after first login!')

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  migrateToUserAuth()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}

module.exports = { migrateToUserAuth }