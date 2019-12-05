#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const __root = process.cwd();

const readFile = (file) => {
  return fs.readFileSync(path.join(__root, file), "utf8")
}

const writeFile = (file, data) => {
  return fs.writeFileSync(path.join(__root, file), data, "utf8")
}

const replaceContent = (regex, replacement, paths, pack) => {
  paths.forEach(path => {
    let data = readFile(path)
    data = data.replace(regex, replacement);
    writeFile(path, data);
    console.log( (pack ? 'Package' : 'Name') + ': ' + path)
  })
}


/** android
--------------------------------------------------------------- */
const replaceNameAndroid = (oldName, newName) => {
  if (oldName === newName) {
    console.log('Name: not change')
    return;
  }
  const modifies = [
    {
      regex: '"name"\\s*:\\s*"{oldName}"',
      replacement: '"name": "{newName}"',
      paths: ['package.json', 'app.json'],
    },
    {
      regex: '<string name="app_name">{oldName}</string>',
      replacement: '<string name="app_name">{newName}</string>',
      paths: ['android/app/src/main/res/values/strings.xml'],
    },
  ];
  modifies.forEach(({regex, replacement, paths}) => {
    regex = new RegExp(regex.replace("{oldName}", oldName));
    replacement = replacement.replace("{newName}", newName);
    replaceContent(regex, replacement, paths)
  })
}

const replacePackAndroid = (oldPack, newPack) => {
  if (oldPack === newPack) {
    console.log('Package: not change')
    return;
  }
  const prefix = 'android/app/src/main/java/';
  const oldPath = oldPack.split('.').join('/');
  const newPath = newPack.split('.').join('/');
  if (!fs.existsSync(path.join(__root, `${prefix}${oldPath}/MainApplication.java`))) {
    console.log(`Package: ${prefix}${oldPath}/MainApplication.java not exist`)
    return;
  }
  replaceContent(oldPack, newPack, [
    'android/app/BUCK', 
    'android/app/build.gradle', 
    'android/app/src/main/AndroidManifest.xml',
    `${prefix}${oldPath}/MainApplication.java`,
    `${prefix}${oldPath}/MainActivity.java`,
  ], true);
  fs.mkdirSync(`${prefix}${newPath}`, {recursive: true});

  fs.renameSync(`${prefix}${oldPath}/MainApplication.java`, `${prefix}${newPath}/MainApplication.java`);
  console.log(`Package: rename to -> ${prefix}${newPath}/MainApplication.java`)

  fs.renameSync(`${prefix}${oldPath}/MainActivity.java`, `${prefix}${newPath}/MainActivity.java`);
  console.log(`Package: rename to -> ${prefix}${newPath}/MainActivity.java`)

  fs.rmdirSync(`${prefix}${oldPath}`);
  console.log(`Package: remove ${prefix}${oldPath}`)
}

const optimizeAndroid = () => {

}








const run = (newName, pack, mut) => {
  // name
  if (!newName) {
    console.error('command: npx rn-rename newName [newPackage]')
    return;
  }
  let data = readFile('app.json');
  data = JSON.parse(data);
  const oldName = 'name' in data ? data.name : null;
  if (oldName === null) {
    console.error('get current name from "app.json" failed')
    return;
  }
  replaceNameAndroid(oldName, newName);

  // package
  if (!pack) {
    return;
  }
  data = readFile('android/app/src/main/AndroidManifest.xml');
  const find = data.match(/<manifest[\s\S]*package\s*=\s*"(.*)"/);
  if (!find) {
    console.error('get current package from "AndroidManifest.xml" failed')
    return;
  }
  const oldPack = find[1];
  replacePackAndroid(oldPack, pack);

  // android optimize
  if (mut) {
    optimizeAndroid();
  }
}

// run
const cargs = process.argv.slice(2);
const optIndex = cargs.indexOf('-opt');
if (optIndex > -1) {
  cargs.splice(optIndex, 1)
}
const [__name, __pack] = cargs;
run(__name, __pack, optIndex > -1);
