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

const PACKAGE_ID = 'com.fugames.turkiyemulkimparatoru';

export function patchAndroidManifest(xml) {
  let updated = xml;

  // 1. Force sensorLandscape orientation & smooth cutout/resize handling on MainActivity
  const mainActivityRegex = /<activity([^>]*android:name="[^"]*MainActivity"[^>]*)>/;
  const match = updated.match(mainActivityRegex);
  if (match) {
    let attrs = match[1];
    if (attrs.includes('android:screenOrientation=')) {
      attrs = attrs.replace(
        /android:screenOrientation="[^"]*"/,
        'android:screenOrientation="sensorLandscape"'
      );
    } else {
      attrs = `${attrs} android:screenOrientation="sensorLandscape"`;
    }

    if (!attrs.includes('android:resizeableActivity=')) {
      attrs = `${attrs} android:resizeableActivity="true"`;
    }

    if (!attrs.includes('android:windowLayoutInDisplayCutoutMode=')) {
      attrs = `${attrs} android:windowLayoutInDisplayCutoutMode="shortEdges"`;
    }

    updated = updated.replace(match[0], `<activity${attrs}>`);
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
  if (!updated.includes(`android:scheme="${PACKAGE_ID}"`)) {
    const deepLinkFilter = [
      '            <intent-filter>',
      '                <action android:name="android.intent.action.VIEW" />',
      '                <category android:name="android.intent.category.DEFAULT" />',
      '                <category android:name="android.intent.category.BROWSABLE" />',
      `                <data android:scheme="${PACKAGE_ID}" android:host="login-callback" />`,
      '            </intent-filter>',
      '        </activity>',
    ].join('\n');

    updated = updated.replace(/<\/activity>/, deepLinkFilter);
  }

  return updated;
}

export function patchAndroidStyles(xml) {
  const edgeToEdgeItems = [
    '        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>',
    '        <item name="android:windowFullscreen">true</item>',
    '        <item name="android:windowTranslucentStatus">false</item>',
    '        <item name="android:windowTranslucentNavigation">false</item>',
    '        <item name="android:statusBarColor">@android:color/transparent</item>',
    '        <item name="android:navigationBarColor">@android:color/transparent</item>',
    '        <item name="android:enforceStatusBarContrast">false</item>',
    '        <item name="android:enforceNavigationBarContrast">false</item>',
  ].join('\n');

  let updated = xml;

  if (updated.includes('android:windowLayoutInDisplayCutoutMode')) {
    return updated;
  }

  // Inject into AppTheme.NoActionBar and AppTheme.NoActionBarLaunch if present
  const injectIntoStyle = (src, styleName) => {
    const regex = new RegExp(`(<style[^>]*name="${styleName}"[^>]*>[\\s\\S]*?)(</style>)`);
    if (!regex.test(src)) return src;
    return src.replace(regex, `$1${edgeToEdgeItems}\n    $2`);
  };

  updated = injectIntoStyle(updated, 'AppTheme\\.NoActionBar');
  updated = injectIntoStyle(updated, 'AppTheme\\.NoActionBarLaunch');

  // Fallback if custom styles.xml only has AppTheme
  if (!updated.includes('android:windowLayoutInDisplayCutoutMode')) {
    updated = injectIntoStyle(updated, 'AppTheme');
  }

  return updated;
}

export function generateEdgeToEdgeMainActivity(packageName = PACKAGE_ID) {
  return `package ${packageName};

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        enableEdgeToEdgeImmersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            enableEdgeToEdgeImmersive();
        }
    }

    private void enableEdgeToEdgeImmersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(lp);
        }

        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        if (controller != null) {
            controller.setSystemBarsBehavior(
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            );
            controller.hide(WindowInsetsCompat.Type.systemBars());
        }
    }
}
`;
}

function main() {
  const root = process.cwd();

  // 1. Patch AndroidManifest.xml
  const manifestPath = path.resolve(
    root,
    process.argv[2] || 'android/app/src/main/AndroidManifest.xml'
  );
  if (!fs.existsSync(manifestPath)) {
    console.error(`AndroidManifest.xml not found at: ${manifestPath}`);
    process.exit(1);
  }
  const patchedManifest = patchAndroidManifest(fs.readFileSync(manifestPath, 'utf8'));
  fs.writeFileSync(manifestPath, patchedManifest, 'utf8');
  console.log(`Patched AndroidManifest.xml: ${manifestPath}`);

  // 2. Patch res/values/styles.xml (shortEdges cutout & edge-to-edge transparency)
  const stylesPath = path.resolve(root, 'android/app/src/main/res/values/styles.xml');
  if (fs.existsSync(stylesPath)) {
    const patchedStyles = patchAndroidStyles(fs.readFileSync(stylesPath, 'utf8'));
    fs.writeFileSync(stylesPath, patchedStyles, 'utf8');
    console.log(`Patched styles.xml (shortEdges Edge-to-Edge): ${stylesPath}`);
  }

  // 3. Patch MainActivity.java (Android 10 - Android 15+ Edge-to-Edge Immersive)
  const mainActivityPath = path.resolve(
    root,
    'android/app/src/main/java/com/fugames/turkiyemulkimparatoru/MainActivity.java'
  );
  if (fs.existsSync(path.dirname(mainActivityPath))) {
    fs.writeFileSync(mainActivityPath, generateEdgeToEdgeMainActivity(PACKAGE_ID), 'utf8');
    console.log(`Patched MainActivity.java (Edge-to-Edge Immersive): ${mainActivityPath}`);
  }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main();
}
