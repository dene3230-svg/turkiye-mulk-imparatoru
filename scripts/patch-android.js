import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED_PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.VIBRATE',
  'android.permission.WAKE_LOCK',
  'android.permission.ACCESS_FINE_LOCATION',
  'android.permission.ACCESS_COARSE_LOCATION',
  'android.permission.CAMERA',
];

export function patchAndroidManifest(xml) {
  let updated = xml;

  // 1. Force sensorLandscape orientation on MainActivity
  const mainActivityRegex = /<activity([^>]*android:name="[^"]*MainActivity"[^>]*)>/;
  const match = updated.match(mainActivityRegex);
  if (match) {
    const attrs = match[1];
    if (attrs.includes('android:screenOrientation=')) {
      const replacedAttrs = attrs.replace(
        /android:screenOrientation="[^"]*"/,
        'android:screenOrientation="sensorLandscape"'
      );
      updated = updated.replace(match[0], `<activity${replacedAttrs}>`);
    } else {
      updated = updated.replace(
        match[0],
        `<activity${attrs} android:screenOrientation="sensorLandscape">`
      );
    }
  }

  // 2. Ensure all forward-looking permissions are declared
  for (const permission of REQUIRED_PERMISSIONS) {
    if (!updated.includes(permission)) {
      updated = updated.replace(
        /<application\b/,
        `    <uses-permission android:name="${permission}" />\n\n    <application`
      );
    }
  }

  // 3. Add Google OAuth deep link intent-filter inside MainActivity
  if (!updated.includes('android:scheme="com.fugames.turkiyemulkimparatoru"')) {
    const deepLinkFilter = [
      '            <intent-filter>',
      '                <action android:name="android.intent.action.VIEW" />',
      '                <category android:name="android.intent.category.DEFAULT" />',
      '                <category android:name="android.intent.category.BROWSABLE" />',
      '                <data android:scheme="com.fugames.turkiyemulkimparatoru" android:host="login-callback" />',
      '            </intent-filter>',
      '        </activity>',
    ].join('\n');

    updated = updated.replace(/<\/activity>/, deepLinkFilter);
  }

  return updated;
}

function main() {
  const manifestPath = path.resolve(
    process.cwd(),
    process.argv[2] || 'android/app/src/main/AndroidManifest.xml'
  );

  if (!fs.existsSync(manifestPath)) {
    console.error(`AndroidManifest.xml not found at: ${manifestPath}`);
    process.exit(1);
  }

  const original = fs.readFileSync(manifestPath, 'utf8');
  const patched = patchAndroidManifest(original);
  fs.writeFileSync(manifestPath, patched, 'utf8');
  console.log(`Patched AndroidManifest.xml successfully: ${manifestPath}`);
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main();
}
