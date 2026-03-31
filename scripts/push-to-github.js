import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// 项目根目录（scripts 的父目录）
const projectRoot = resolve(__dirname, '..');

// 切换到项目根目录
process.chdir(projectRoot);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function exec(command, description) {
  console.log(`\n📌 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit', cwd: projectRoot });
    console.log(`✅ ${description}成功\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description}失败\n`);
    return false;
  }
}

async function main() {
  console.log('☁️  开始推送到 GitHub...\n');
  console.log(`📁 项目目录: ${projectRoot}\n`);

  // 检查是否有更改
  try {
    execSync('git diff --quiet', { stdio: 'ignore', cwd: projectRoot });
    execSync('git diff --cached --quiet', { stdio: 'ignore', cwd: projectRoot });
    console.log('⚠️  没有检测到更改，跳过提交步骤');
    rl.close();
    return;
  } catch (e) {
    // 有更改，继续
  }

  // 1. 添加所有更改
  execSync('git add .', { stdio: 'inherit', cwd: projectRoot });

  // 2. 提交
  const commitMsg = await question('请输入提交信息（直接回车使用默认信息）: ');
  const finalMsg = commitMsg.trim() || '更新文章内容';

  if (!exec(`git commit -m "${finalMsg}"`, '提交代码到 Git')) {
    console.log('⚠️  提交失败（可能没有更改）');
    rl.close();
    return;
  }

  // 3. 推送到 GitHub
  if (!exec('git push origin main', '推送到 GitHub')) {
    console.log('⚠️  推送失败，请检查网络连接或 Git 配置');
    rl.close();
    process.exit(1);
  }

  console.log('\n🎉 推送完成！Vercel 将自动部署新版本');
  rl.close();
}

main().catch(console.error);

