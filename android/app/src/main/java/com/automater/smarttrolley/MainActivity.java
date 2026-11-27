package com.automater.smarttrolley;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.KeyEvent;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private volatile boolean tillCheckoutActive = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            webView.addJavascriptInterface(new AndroidAutomaterBridge(), "AndroidAutomaterInterface");
        }
    }

    /**
     * Intercepts the physical Top Volume Button (KEYCODE_VOLUME_UP) when Till Checkout is active
     * so the cashier can advance barcodes one-by-one without triggering the OS volume popup.
     */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (tillCheckoutActive) {
            int keyCode = event.getKeyCode();
            if (keyCode == KeyEvent.KEYCODE_VOLUME_UP) {
                if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                    vibrateNative(new long[]{0, 45});
                    dispatchJsEvent("automater:volume-up");
                }
                return true;
            }
            if (keyCode == KeyEvent.KEYCODE_VOLUME_DOWN) {
                if (event.getAction() == KeyEvent.ACTION_DOWN && event.getRepeatCount() == 0) {
                    vibrateNative(new long[]{0, 25});
                    dispatchJsEvent("automater:volume-down");
                }
                return true;
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private void dispatchJsEvent(final String eventName) {
        runOnUiThread(() -> {
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().getWebView().evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('" + eventName + "', { detail: { source: 'android-hardware' } }));",
                    null
                );
            }
        });
    }

    private Vibrator getDeviceVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vm != null ? vm.getDefaultVibrator() : null;
        }
        return (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
    }

    private void vibrateNative(long[] pattern) {
        try {
            Vibrator vibrator = getDeviceVibrator();
            if (vibrator == null || !vibrator.hasVibrator()) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                vibrator.vibrate(pattern, -1);
            }
        } catch (Exception ignored) {
        }
    }

    public class AndroidAutomaterBridge {

        @JavascriptInterface
        public void vibrate(int durationMs) {
            int safeMs = Math.max(15, Math.min(durationMs, 500));
            vibrateNative(new long[]{0, safeMs});
        }

        @JavascriptInterface
        public void vibratePattern(String csvPattern) {
            try {
                String[] parts = csvPattern.split(",");
                long[] timings = new long[parts.length + 1];
                timings[0] = 0;
                for (int i = 0; i < parts.length; i++) {
                    timings[i + 1] = Math.max(10, Long.parseLong(parts[i].trim()));
                }
                vibrateNative(timings);
            } catch (Exception e) {
                vibrateNative(new long[]{0, 70, 40, 90});
            }
        }

        @JavascriptInterface
        public void setTillCheckoutActive(final boolean active) {
            tillCheckoutActive = active;
            runOnUiThread(() -> {
                WindowManager.LayoutParams params = getWindow().getAttributes();
                if (active) {
                    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    params.screenBrightness = 1.0f; // Max brightness for 1D laser scanner clarity
                } else {
                    getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                    params.screenBrightness = WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE;
                }
                getWindow().setAttributes(params);
            });
        }

        @JavascriptInterface
        public void onProductAddedToCart(String payloadJson) {
            vibrateNative(new long[]{0, 75, 40, 95});
        }

        @JavascriptInterface
        public void onProductAddedToList(String payloadJson) {
            vibrateNative(new long[]{0, 35});
        }

        @JavascriptInterface
        public void onProductSelected(String payloadJson) {
            vibrateNative(new long[]{0, 20});
        }

        @JavascriptInterface
        public void onRetailerChanged(String retailerId) {
        }
    }
}
