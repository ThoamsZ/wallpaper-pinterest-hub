import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('Supabase 配置:', {
  url: supabaseUrl ? '已设置' : '未设置',
  key: supabaseAnonKey ? '已设置' : '未设置'
})

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少 Supabase 环境变量')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// 测试连接
supabase.auth.getSession().then(() => {
  console.log('Supabase 客户端初始化成功')
}).catch(error => {
  console.error('Supabase 客户端初始化失败:', error)
}) 