const figlet = require('figlet');
const chalk = require('chalk').default;

function displayBanner() {
    const banner = figlet.textSync('Crypto Kidzs', {
        font: 'ANSI Shadow',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    });
    console.log(chalk.green(banner));
    console.log(chalk.cyan('========================================='));
    console.log(chalk.magentaBright('Github   : https://github.com/CryptoKidzz'));
    console.log(chalk.magentaBright('Telegram : https://t.me/CryptoKidz'));
    console.log(chalk.cyan('========================================='));
}
displayBanner();