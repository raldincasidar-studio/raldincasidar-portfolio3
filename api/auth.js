import jwt from 'jsonwebtoken'
import { Admin } from './models.js'
const COOKIE = 'portfolio_admin_token'
export const cookieName = COOKIE
export function signAdmin(admin) { if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not configured'); return jwt.sign({ sub: String(admin._id), role: admin.role, email: admin.email, sessionVersion: admin.sessionVersion || 1 }, process.env.JWT_SECRET, { expiresIn: '8h' }) }
export function requireAuth(req, res, next) { try { const token = req.cookies?.[COOKIE] || req.headers.authorization?.replace(/^Bearer\s+/i, ''); if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }); req.auth = jwt.verify(token, process.env.JWT_SECRET); next() } catch { return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session' } }) } }
export async function loadAdmin(req, res, next) { const admin = await Admin.findById(req.auth.sub).lean(); if (!admin?.active) return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Admin account is inactive' } }); if ((admin.sessionVersion || 1) !== (req.auth.sessionVersion || 1)) return res.status(401).json({ error: { code: 'SESSION_REVOKED', message: 'Session expired, please sign in again' } }); req.admin = admin; next() }
export const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/' }
