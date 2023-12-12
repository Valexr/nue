
import { getBuilder, minifyJS } from './builder.js'
import { join, basename } from 'node:path'
import { promises as fs } from 'node:fs'
import { compileFile } from 'nuejs-core'
import { log } from './util.js'


export async function syncNueDir(dist, is_prod) {
  const root = new URL('.', import.meta.url).pathname
  const assets = join(root, 'browser')
  const nuedir = join(dist, '@nue')

  // make sure JS minifier exist in production
  try {
    if (is_prod) await getBuilder()
  } catch {
    throw 'Bundler not found. Use Bun or install esbuild'
  }

  await fs.mkdir(nuedir, { recursive: true })

  async function symlink(src, name) {
    const target = join(nuedir, name || basename(src))
    try {
      await fs.symlink(src, target)
      log('Created symlink', target)
    } catch (e) {
      if (e.code != 'EEXIST') throw e
      else log('Exists', basename(src))
    }
  }

  // nue JS
  const jsdir = join(nuedir, 'js')
  await fs.mkdir(jsdir, { recursive: true })
  await fs.copyFile(join(assets, 'nue.js'), join(jsdir, 'nue.js'))

  // production
  if (is_prod) {
    await minifyJS(join(assets, 'page-router.js'), nuedir)
    await minifyJS(join(assets, 'app-router.js'), nuedir)
    await minifyJS(join(assets, 'mount.js'), nuedir)

    // do this later
    // await minifyJS(join(root, '../../nuejs/src/browser/nue.js'), jsdir, true)

  } else {
    // await symlink(join(root, 'src'), 'js')

    await symlink(join(assets, 'page-router.js'))
    await symlink(join(assets, 'app-router.js'))
    await symlink(join(assets, 'hotreload.js'))
    await symlink(join(assets, 'mount.js'))

    // dev only
    await symlink(join(root, 'node_modules/diff-dom/dist/module.js'), 'diffdom.js')
    await compileFile(join(assets, 'error.nue'), join(nuedir, 'error.js'))
    await symlink(join(assets, 'error.css'))
  }



  // favicon
  const favicon = join(dist, 'favicon.ico')
  try {
    await fs.stat(favicon)

  } catch {
    await fs.copyFile(join(assets, 'favicon.ico'), favicon)
    log('Added default /favicon.ico')
  }

}
