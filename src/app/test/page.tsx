import fs from 'node:fs'
import path from 'node:path'

export default function TestPage() {
  const filePath = path.join(process.cwd(), '.context', 'map.html')
  const html = fs.readFileSync(filePath, 'utf-8')
  return (
    <main className="min-h-screen w-screen bg-white">
      <div
        className="w-full h-screen"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  )
}
