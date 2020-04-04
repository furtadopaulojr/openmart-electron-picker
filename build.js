var electronInstaller = require('electron-winstaller');

// In this case, we can use relative paths
var settings = {
    name: 'picker',
    // Specify the folder where the built app is located
    appDirectory: './openmart_picker-win32-x64',
    // Specify the existing folder where
    outputDirectory: './openmart_picker_installer',
    // The name of the Author of the app (the name of your company)
    authors: 'Openmart',
    // The name of the executable of your built
    exe: './openmart_picker.exe',
    description: 'picker',
};

resultPromise = electronInstaller.createWindowsInstaller(settings);

resultPromise.then(() => {
    console.log("The installers of your application were succesfully created !");
}, (e) => {
    console.log(`Well, sometimes you are not so lucky: ${e.message}`)
});
