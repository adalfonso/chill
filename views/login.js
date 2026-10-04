// Served same-origin from /auth/login.js rather than inlined in login.html:
// the production CSP (nginx.conf) allows script-src 'self' only, so an inline
// <script> would be blocked and none of this -- including the native Custom
// Tab login -- would run.

// /auth/login?failure=true is set by the server (a denied/failed
// Google OAuth attempt, or a login-session creation failure) --
// this page has no framework/build step, so read it with plain JS.
if (new URLSearchParams(location.search).get("failure") === "true") {
  document.getElementById("login-error").hidden = false;
}

// In the native app, Google refuses to render its login form inside the
// embedded WebView. Route it through a Custom Tab instead (real Chrome,
// so Google allows it) and return here via deep link when it's done,
// rather than letting Google force a jarring hand-off to the full
// Chrome app on its own.
(function () {
  var capacitor = window.Capacitor;
  if (!capacitor || !capacitor.isNativePlatform || !capacitor.isNativePlatform()) {
    return;
  }

  var link = document.getElementById("google-login");
  var items = document.querySelector(".items");
  var spinner = document.getElementById("spinner");

  // Swapped in the instant the deep link arrives, before the token
  // exchange even starts, so there's no stale flash of the login
  // screen while that request is in flight.
  var showSpinner = function () {
    items.style.display = "none";
    spinner.style.display = "block";
  };

  var showLogin = function () {
    items.style.display = "flex";
    spinner.style.display = "none";
  };

  var VERIFIER_KEY = "chill_native_verifier";

  // base64url without padding, matching the server's challenge format
  var base64url = function (bytes) {
    return btoa(String.fromCharCode.apply(null, bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  };

  // The verifier never leaves this app except in the redeem request; only
  // its SHA-256 challenge goes out through the Custom Tab, so a deep link
  // intercepted by another app cannot be redeemed without it. Kept in
  // localStorage so it survives Android recreating the WebView while the
  // user is in the Custom Tab.
  link.addEventListener("click", function (event) {
    event.preventDefault();

    var verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
    localStorage.setItem(VERIFIER_KEY, verifier);

    crypto.subtle
      .digest("SHA-256", new TextEncoder().encode(verifier))
      .then(function (digest) {
        var challenge = base64url(new Uint8Array(digest));

        capacitor.Plugins.Browser.open({
          url:
            window.location.origin +
            "/auth/google?platform=native&challenge=" +
            challenge,
        });
      });
  });

  capacitor.Plugins.App.addListener("appUrlOpen", function (data) {
    var url = data.url || "";
    var marker_index = url.indexOf("auth/callback");
    if (marker_index === -1) {
      return;
    }

    capacitor.Plugins.Browser.close();
    showSpinner();

    // The Custom Tab's cookie jar is separate from this WebView, so the
    // cookies set at the end of the web OAuth flow never reach us here.
    // The deep link carries a single-use code instead; redeem it, with
    // the verifier only this app holds, through a request that actually
    // originates from this WebView so the resulting Set-Cookie lands in
    // the right cookie jar.
    var params = new URLSearchParams(url.slice(marker_index).split("?")[1] || "");
    var code = params.get("code");
    var verifier = localStorage.getItem(VERIFIER_KEY);
    localStorage.removeItem(VERIFIER_KEY);

    if (!code || !verifier) {
      showLogin();
      return;
    }

    fetch("/auth/native/exchange", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "fetch",
      },
      credentials: "include",
      body: JSON.stringify({ code: code, verifier: verifier }),
    })
      .then(function (response) {
        if (response.ok) {
          window.location.href = "/";
          return;
        }
        showLogin();
      })
      .catch(showLogin);
  });
})();
