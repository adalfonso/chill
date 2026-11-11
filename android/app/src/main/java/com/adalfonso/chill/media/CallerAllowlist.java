package com.adalfonso.chill.media;

import java.util.Set;

/**
 * Decides which apps may connect to the media service.
 *
 * <p>Android Auto needs the service exported, which also lets any other app on
 * the phone bind to it, read the now-playing details, and send play, pause, and
 * skip commands. Only Android Auto, the system media controller, and Chill
 * itself are accepted.
 */
public final class CallerAllowlist {

  /** Android Auto's package on the phone. */
  public static final String ANDROID_AUTO = "com.google.android.projection.gearhead";

  /** The system UI, which draws the notification and lock screen controls. */
  public static final String SYSTEM_UI = "com.android.systemui";

  /** The Android framework itself, used for media buttons and system controllers. */
  public static final String ANDROID_FRAMEWORK = "android";

  private static final Set<String> ALLOWED = Set.of(ANDROID_AUTO, SYSTEM_UI, ANDROID_FRAMEWORK);

  private CallerAllowlist() {}

  /**
   * @param callerPackage the package of the app asking to connect
   * @param ownPackage Chill's own package, always allowed
   * @return true when the caller may connect
   */
  public static boolean isAllowed(String callerPackage, String ownPackage) {
    if (callerPackage == null) {
      return false;
    }

    return callerPackage.equals(ownPackage) || ALLOWED.contains(callerPackage);
  }
}
