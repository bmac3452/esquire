import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  errorFormat: 'pretty',
  log: ['query', 'error', 'warn']
})

export default prisma
