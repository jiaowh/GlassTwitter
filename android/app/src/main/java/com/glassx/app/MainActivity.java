package com.glassx.app;

import android.app.Activity;
import android.net.http.SslError;
import android.graphics.Bitmap;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.*;
import android.widget.*;
import org.json.JSONObject;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView web;
    private LinearLayout shell;
    private ProgressBar progress;
    private TextView status;
    private ValueCallback<Uri[]> files;
    private View fullscreen;
    private WebChromeClient.CustomViewCallback fullscreenCallback;
    private String injection;
    private boolean refreshFromTop;
    private LinearLayout feedDock;
    private static final int PICK_FILES = 10;

    private boolean isX(String address) {
        if (address == null) return false;
        Uri uri = Uri.parse(address);
        return "https".equals(uri.getScheme()) && ("x.com".equals(uri.getHost()) || "twitter.com".equals(uri.getHost()));
    }
    private String asset(String name) throws IOException {
        try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] bytes = new byte[8192]; int n;
            while ((n = in.read(bytes)) != -1) out.write(bytes, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
    private void decorate() {
        if (isX(web.getUrl()) && injection != null) {
            web.evaluateJavascript(injection, null);
        }
    }
    private void outside(String address) {
        if (address == null) return;
        Uri uri = Uri.parse(address);
        if (!"https".equals(uri.getScheme()) && !"http".equals(uri.getScheme())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri)); }
        catch (Exception e) { Toast.makeText(this, "No browser available", Toast.LENGTH_SHORT).show(); }
    }
    private void addDockButton(String text, String label, Runnable action) {
        Button button = new Button(this);
        button.setText(text); button.setContentDescription(label); button.setAllCaps(false);
        button.setTextColor(Color.rgb(237,246,255));
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setTextSize(text.equals("𝕏") ? 25 : 14);
        button.setOnClickListener(v -> action.run());
        feedDock.addView(button, new LinearLayout.LayoutParams(0, Math.round(52 * getResources().getDisplayMetrics().density), 1));
    }
    private void selectFeed(int index) {
        // Native hidden tab controls keep X's own handlers and feed selection.
        web.evaluateJavascript("(()=>{const tabs=[...document.querySelectorAll('[role=tablist]')].find(e=>!e.closest('article,[role=dialog]'));const tab=tabs?.querySelectorAll('[role=tab]')[" + index + "];if(tab){tab.click();window.scrollTo(0,0);return true;}return false;})()", result -> {
            if (!"true".equals(result)) Toast.makeText(this, "Feed tabs are still loading", Toast.LENGTH_SHORT).show();
        });
    }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        shell = new LinearLayout(this); shell.setOrientation(LinearLayout.VERTICAL);
        shell.setBackgroundColor(Color.rgb(16,24,32)); setContentView(shell);
        // Android 15 edge-to-edge: keep controls out of status bars and keyboard.
        shell.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        shell.addView(progress, new LinearLayout.LayoutParams(-1, 3));
        status = new TextView(this); status.setTextColor(Color.WHITE); status.setPadding(12,8,12,8);
        status.setVisibility(View.GONE);
        status.setOnClickListener(v -> web.reload());
        shell.addView(status);
        web = new WebView(this); web.setBackgroundColor(Color.rgb(16,24,32));
        shell.addView(web, new LinearLayout.LayoutParams(-1,0,1));
        feedDock = new LinearLayout(this);
        feedDock.setGravity(android.view.Gravity.CENTER);
        addDockButton("For you", "Show For you feed", () -> selectFeed(0));
        addDockButton("𝕏", "Refresh tweets", () -> {
            refreshFromTop = true;
            web.evaluateJavascript("history.scrollRestoration='manual';window.scrollTo(0,0);", null);
            web.reload();
        });
        addDockButton("Following", "Show Following feed", () -> selectFeed(1));
        shell.addView(feedDock);

        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        try {
            injection = "(()=>{if(location.protocol!=='https:'||!['x.com','twitter.com'].includes(location.hostname)||window.__glassXApp)return;window.__glassXApp=true;document.documentElement.classList.add('glass-x-app');"
                + "const style=document.createElement('style');style.textContent=" + JSONObject.quote(asset("styles.css") + asset("app.css"))
                + ";document.head.append(style);" + asset("content.js") + asset("ad-filter.js") + asset("app.js") + "})();";
        } catch (IOException e) { status.setText(R.string.style_error); status.setVisibility(View.VISIBLE); }
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                String url = request.getUrl().toString();
                if (isX(url)) return false;
                outside(url); return true;
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
                boolean home = isX(url) && Uri.parse(url).getPath().matches("/home/?");
                feedDock.setVisibility(home ? View.VISIBLE : View.GONE);
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                status.setVisibility(View.GONE);
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel();
                status.setText(R.string.ssl_error);
                status.setVisibility(View.VISIBLE);
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) {
                    status.setText(getString(R.string.http_error, response.getStatusCode()));
                    status.setVisibility(View.VISIBLE);
                }
            }
            @Override public void onPageCommitVisible(WebView view, String url) { decorate(); }
            @Override public void onPageFinished(WebView view, String url) {
                decorate(); CookieManager.getInstance().flush();
                if (refreshFromTop && isX(url)) {
                    view.evaluateJavascript("window.scrollTo(0,0);", null);
                    view.scrollTo(0,0); refreshFromTop = false;
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    status.setText(R.string.load_error); status.setVisibility(View.VISIBLE);
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) {
                progress.setProgress(value); progress.setVisibility(value == 100 ? View.GONE : View.VISIBLE);

            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (files != null) files.onReceiveValue(null);
                files = callback;
                try { startActivityForResult(params.createIntent(), PICK_FILES); }
                catch (Exception e) { files = null; return false; }
                return true;
            }
            @Override public void onShowCustomView(View view, CustomViewCallback callback) {
                if (fullscreen != null) { callback.onCustomViewHidden(); return; }
                fullscreen = view; fullscreenCallback = callback;
                shell.setVisibility(View.GONE);
                addContentView(view, new android.view.ViewGroup.LayoutParams(-1,-1));
            }
            @Override public void onHideCustomView() { exitFullscreen(); }
        });
        if (state == null || web.restoreState(state) == null) web.loadUrl("https://x.com/home");
    }
    private void exitFullscreen() {
        if (fullscreen == null) return;
        ((android.view.ViewGroup)fullscreen.getParent()).removeView(fullscreen);
        fullscreen = null; shell.setVisibility(View.VISIBLE);
        if (fullscreenCallback != null) fullscreenCallback.onCustomViewHidden();
        fullscreenCallback = null;
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request,result,data);
        if (request == PICK_FILES && files != null) {
            files.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result,data)); files = null;
        }
    }
    @Override public void onBackPressed() {
        if (fullscreen != null) exitFullscreen();
        else if (web.canGoBack()) web.goBack(); else super.onBackPressed();
    }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override protected void onPause() { web.onPause(); CookieManager.getInstance().flush(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        if (files != null) files.onReceiveValue(null);
        exitFullscreen(); shell.removeView(web); web.destroy(); super.onDestroy();
    }
}
