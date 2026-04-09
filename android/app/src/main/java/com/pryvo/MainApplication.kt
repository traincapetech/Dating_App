package com.pryvo

import android.app.Application
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.PackageList
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
          // Use autolinking to keep native modules in sync
          val packages = PackageList(this).packages.toMutableList()
          packages.add(PryvoPackage())
          return packages
        }

        override fun getJSMainModuleName(): String = "index"

        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG // Re-enable to connect to Metro

        override fun getBundleAssetName(): String = "index.android.bundle"

        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }

  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)

  override fun onCreate() {
    super.onCreate()
    try {
      Log.d("MainApplication", "onCreate called")
      SoLoader.init(this, OpenSourceMergedSoMapping)
      Log.d("MainApplication", "SoLoader initialized")
      if (BuildConfig.IS_NEW_ARCHITECTURE_ENABLED) {
        // If you opted-in for the New Architecture, we load the native entry point for this app.
        load()
        Log.d("MainApplication", "New Architecture loaded")
      }
      Log.d("MainApplication", "Application initialized successfully")
      Log.d("MainApplication", "getUseDeveloperSupport: ${reactNativeHost.useDeveloperSupport}")
      Log.d("MainApplication", "getBundleAssetName: index.android.bundle")
      Log.d("MainApplication", "getJSMainModuleName: index")
    } catch (e: Exception) {
      Log.e("MainApplication", "Error initializing application", e)
      throw e
    }
  }
}
