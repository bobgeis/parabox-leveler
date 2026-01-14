import { execSync } from 'node:child_process'

const main = async () => {
  console.log('▶️ Starting gh-pages deployment...')

  console.log('▶️ Building prod files...')
  execSync('pnpm build')

  console.log('▶️ Deleting gh-pages branch from remote...')
  execSync('git push -d origin gh-pages')

  console.log('▶️ Creating gh-pages branch locally...')
  execSync('git checkout -B gh-pages')

  console.log('▶️ Adding dist...')
  execSync('git add -f dist')

  console.log('▶️ Committing dist...')
  execSync('git commit -m "add dist"')

  console.log('▶️ Pushing subtree...')
  execSync('git subtree push --prefix dist origin gh-pages')

  console.log('▶️ Checking out main...')
  execSync('git checkout main')

  console.log('▶️ Deleting gh-pages branch locally...')
  execSync('git branch -D gh-pages')

  console.log('✅ Deployed to gh-pages successfully!')
}

main().catch((err) => console.error('❌ Deployment failed:', err))
