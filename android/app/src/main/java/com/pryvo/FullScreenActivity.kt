package com.pryvo

import android.graphics.Color
import android.media.MediaPlayer
import android.os.*
import android.provider.Settings
import android.view.WindowManager
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class FullScreenActivity : AppCompatActivity() {

    private lateinit var timerText: TextView
    private var handler = Handler(Looper.getMainLooper())
    private var totalSeconds = 600 // 10 minutes

    private var mediaPlayer: MediaPlayer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Show over lock screen
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
        )

        setContentView(R.layout.custom_notification)

        timerText = findViewById(R.id.timer)

        startTimer()
        startRinging()

        findViewById<TextView>(R.id.btnJoin).setOnClickListener {
            stopRinging()
            finish()
        }
    }

    private fun startTimer() {
        handler.post(object : Runnable {
            override fun run() {

                val hours = totalSeconds / 3600
                val minutes = (totalSeconds % 3600) / 60
                val seconds = totalSeconds % 60

                timerText.text = String.format("%02d:%02d:%02d", hours, minutes, seconds)

                if (totalSeconds <= 10) {
                    timerText.setTextColor(Color.RED)
                }

                if (totalSeconds > 0) {
                    totalSeconds--
                    handler.postDelayed(this, 1000)
                }
            }
        })
    }

    private fun startRinging() {
        mediaPlayer = MediaPlayer.create(this, Settings.System.DEFAULT_RINGTONE_URI)
        mediaPlayer?.isLooping = true
        mediaPlayer?.start()
    }

    private fun stopRinging() {
        mediaPlayer?.stop()
        mediaPlayer?.release()
    }

    override fun onDestroy() {
        super.onDestroy()
        stopRinging()
    }
}
