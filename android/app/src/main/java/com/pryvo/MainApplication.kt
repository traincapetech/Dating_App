package com.pryvo

import android.app.Application
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.load
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.shell.MainReactPackage
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class MainApplication : Application(), ReactApplication {

  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> {
          // Include MainReactPackage which contains all core React Native modules (AppState, ImageLoader, etc.)
          val packages = ArrayList<ReactPackage>()
          packages.add(MainReactPackage())
          // Add manually linked packages
          packages.add(com.swmansion.gesturehandler.RNGestureHandlerPackage())
          packages.add(com.th3rdwave.safeareacontext.SafeAreaContextPackage())
          packages.add(com.BV.LinearGradient.LinearGradientPackage())
          packages.add(com.swmansion.rnscreens.RNScreensPackage())
          packages.add(com.reactnativecommunity.asyncstorage.AsyncStoragePackage())
          packages.add(com.imagepicker.ImagePickerPackage())
          packages.add(org.reactnative.maskedview.RNCMaskedViewPackage())
          packages.add(com.agontuk.RNFusedLocation.RNFusedLocationPackage())
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
