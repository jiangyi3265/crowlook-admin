import JSEncrypt from 'jsencrypt/bin/jsencrypt.min'

// 公钥由调用方或运行环境提供；客户端仓库不得保存对应私钥。
export function encrypt(txt, publicKey) {
  if (!publicKey) {
    throw new Error('A public key is required for RSA encryption')
  }
  const encryptor = new JSEncrypt()
  encryptor.setPublicKey(publicKey)
  return encryptor.encrypt(txt)
}
