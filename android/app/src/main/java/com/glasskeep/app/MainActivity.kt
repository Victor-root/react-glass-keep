package com.glasskeep.app

import android.app.Activity
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowInsetsControllerCompat
import com.glasskeep.app.ui.SetupScreen
import com.glasskeep.app.ui.theme.GlassKeepTheme

class MainActivity : ComponentActivity() {

    private val prefs by lazy {
        getSharedPreferences("glasskeep", MODE_PRIVATE)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // If URL already configured, go straight to WebView
        val savedUrl = prefs.getString("server_url", null)
        if (savedUrl != null) {
            // App-shortcut entry point: long-press launcher → "Scan PC
            // login" sends ACTION_SHORTCUT_QR_SCAN. Append a one-shot
            // ?qr=open marker the SPA picks up at boot to pop the QR
            // scanner modal straight away (only if the user already
            // has a valid session — otherwise the marker is consumed
            // silently). Strips itself from the URL bar so a refresh
            // doesn't reopen the modal indefinitely.
            val urlToLoad = if (intent?.action == ACTION_SHORTCUT_QR_SCAN) {
                appendQueryParam(savedUrl, "qr", "open")
            } else {
                savedUrl
            }
            launchWebView(urlToLoad)
            return
        }

        setContent {
            val dark = isSystemInDarkTheme()
            val view = LocalView.current
            SideEffect {
                val w = (view.context as Activity).window
                if (dark) {
                    val bgColor = Color.parseColor("#1a1a1a")
                    w.statusBarColor = bgColor
                    w.navigationBarColor = bgColor
                    WindowInsetsControllerCompat(w, view).apply {
                        isAppearanceLightStatusBars = false
                        isAppearanceLightNavigationBars = false
                    }
                } else {
                    val bgColor = Color.parseColor("#f0e8ff")
                    w.statusBarColor = bgColor
                    w.navigationBarColor = bgColor
                    WindowInsetsControllerCompat(w, view).apply {
                        isAppearanceLightStatusBars = true
                        isAppearanceLightNavigationBars = true
                    }
                }
            }
            GlassKeepTheme {
                SetupScreen(onConnect = { url ->
                    prefs.edit().putString("server_url", url).apply()
                    launchWebView(url)
                })
            }
        }
    }

    private fun launchWebView(url: String) {
        val intent = Intent(this, WebViewActivity::class.java)
        intent.putExtra("url", url)
        startActivity(intent)
        finish()
    }

    // Tack a query parameter onto a URL without dragging in a full URI
    // parser. Handles both "no existing query" and "already has ?foo"
    // cases. Values are URL-encoded so a future caller can pass
    // anything safely.
    private fun appendQueryParam(url: String, key: String, value: String): String {
        val sep = if (url.contains("?")) "&" else "?"
        val encodedKey = java.net.URLEncoder.encode(key, "UTF-8")
        val encodedValue = java.net.URLEncoder.encode(value, "UTF-8")
        return "$url$sep$encodedKey=$encodedValue"
    }

    companion object {
        private const val ACTION_SHORTCUT_QR_SCAN = "com.glasskeep.app.SHORTCUT_QR_SCAN"
    }
}
