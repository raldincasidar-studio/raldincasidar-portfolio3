import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { Admin } from './models.js'

const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
if (!process.env.MONGODB_URI || !email || !password || password === 'change-me' || password === 'replace-me') throw new Error('Set MONGODB_URI, ADMIN_EMAIL, and a strong ADMIN_PASSWORD before seeding')
if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters')
await mongoose.connect(process.env.MONGODB_URI)
const passwordHash = await bcrypt.hash(password, 12)
await Admin.findOneAndUpdate({ email: email.toLowerCase() }, { email: email.toLowerCase(), passwordHash, role: 'admin', active: true }, { upsert: true, new: true, setDefaultsOnInsert: true })
console.log(`Admin seeded: ${email.toLowerCase()}`)
await mongoose.disconnect()
