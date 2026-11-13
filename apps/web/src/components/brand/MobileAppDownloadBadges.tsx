import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, ExternalLink, QrCode, Smartphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Official Apple SVG Icon
export function AppleStoreIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 384 512"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

// Official Google Play Colorful Icon
export function GooglePlayIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M48.7 21.6c-4.4 4.7-6.9 12.2-6.9 21.9v425c0 9.7 2.5 17.2 6.9 21.9l2.4 2.4L274 269.9v-5.8L51.1 19.2l-2.4 2.4z"
        fill="#00D2FF"
      />
      <path
        d="M348.6 344.5l-74.6-74.6v-5.8l74.6-74.6 1.7 1 88.5 50.3c25.3 14.4 25.3 37.9 0 52.3l-88.5 50.3-1.7 1.1z"
        fill="#FFCE00"
      />
      <path
        d="M350.3 343.4l-76.3-76.3L48.7 490.8c8.3 8.8 22 9.9 37.3 1.2l264.3-148.6z"
        fill="#FF334B"
      />
      <path
        d="M350.3 168.6L86 20c-15.3-8.6-29-7.5-37.3 1.2l225.3 223.7 76.3-76.3z"
        fill="#00E676"
      />
    </svg>
  );
}

// Android Robot Icon
export function AndroidRobotIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.551 0 .9993.4482.9993.9993.0001.5511-.4483.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.4126 13.8533 8.125 12 8.125c-1.8533 0-3.5902.2876-5.1368.8247L4.8409 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3432-4.1021-2.6889-7.5743-6.1185-9.4396" />
    </svg>
  );
}

interface MobileAppDownloadBadgesProps {
  className?: string;
  showQrToggle?: boolean;
}

export function MobileAppDownloadBadges({
  className = "",
  showQrToggle = true,
}: MobileAppDownloadBadgesProps) {
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<"android" | "ios">("android");

  const androidUrl =
    import.meta.env.VITE_ANDROID_APP_URL || "https://wateam.ayyansystems.com/downloads/android";
  const iosUrl =
    import.meta.env.VITE_IOS_APP_URL || "https://wateam.ayyansystems.com/downloads/ios";

  const isMobileBrowser =
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const currentUrl = selectedPlatform === "android" ? androidUrl : iosUrl;

  useEffect(() => {
    if (!qrModalOpen || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, currentUrl, {
      width: 220,
      margin: 2,
      color: {
        dark: "#0b141a",
        light: "#ffffff",
      },
    }).catch(() => {
      // ignore
    });
  }, [qrModalOpen, selectedPlatform, currentUrl]);

  const handleBadgeClick = (
    e: React.MouseEvent,
    platform: "android" | "ios",
    url: string,
  ) => {
    // On mobile devices, follow the link directly
    if (isMobileBrowser) {
      window.location.href = url;
      return;
    }

    // On desktop, open the QR scan modal for easiest mobile installation
    e.preventDefault();
    setSelectedPlatform(platform);
    setQrModalOpen(true);
  };

  return (
    <>
      <div className={`flex flex-col items-center gap-2.5 ${className}`}>
        <div className="flex items-center gap-2.5 w-full justify-center">
          {/* Google Play / Android Badge */}
          <a
            href={androidUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleBadgeClick(e, "android", androidUrl)}
            className="group flex-1 max-w-[155px] sm:max-w-[170px] h-[46px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all duration-150 flex items-center px-3 gap-2.5 dark:border-dark-border dark:bg-dark-secondary dark:hover:bg-dark-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Download for Android"
          >
            <GooglePlayIcon className="h-5 w-5 shrink-0" />
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className="text-[9px] uppercase font-semibold leading-none tracking-wider text-slate-400 dark:text-dark-text-tertiary">
                GET IT ON
              </span>
              <span className="text-xs font-bold leading-tight text-slate-800 dark:text-dark-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                Google Play
              </span>
            </div>
          </a>

          {/* Apple App Store Badge */}
          <a
            href={iosUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => handleBadgeClick(e, "ios", iosUrl)}
            className="group flex-1 max-w-[155px] sm:max-w-[170px] h-[46px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm transition-all duration-150 flex items-center px-3 gap-2.5 dark:border-dark-border dark:bg-dark-secondary dark:hover:bg-dark-tertiary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            title="Download on the App Store"
          >
            <AppleStoreIcon className="h-5 w-5 shrink-0 text-slate-900 dark:text-white" />
            <div className="flex flex-col text-left overflow-hidden min-w-0">
              <span className="text-[9px] uppercase font-semibold leading-none tracking-wider text-slate-400 dark:text-dark-text-tertiary">
                Download on the
              </span>
              <span className="text-xs font-bold leading-tight text-slate-800 dark:text-dark-text-primary group-hover:text-emerald-600 dark:group-hover:text-emerald-400 truncate">
                App Store
              </span>
            </div>
          </a>

          {/* QR Code Action Button for Desktop */}
          {showQrToggle && !isMobileBrowser && (
            <button
              type="button"
              onClick={() => setQrModalOpen(true)}
              className="h-[46px] w-[46px] shrink-0 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 shadow-sm flex items-center justify-center text-slate-600 hover:text-emerald-600 dark:border-dark-border dark:bg-dark-secondary dark:text-dark-text-secondary dark:hover:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              title="Scan QR Code to install on phone"
              aria-label="Scan QR Code to install on mobile phone"
            >
              <QrCode className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* QR Code & Direct Download Dialog */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-dark-secondary dark:border-dark-border text-slate-900 dark:text-dark-text-primary">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Smartphone className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center text-lg font-bold">
              Get WATeamInbox on your Phone
            </DialogTitle>
            <DialogDescription className="text-center text-xs text-slate-500 dark:text-dark-text-secondary">
              Scan the QR code with your mobile camera to install the app.
            </DialogDescription>
          </DialogHeader>

          {/* Platform Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-dark-tertiary">
            <button
              type="button"
              onClick={() => setSelectedPlatform("android")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                selectedPlatform === "android"
                  ? "bg-white text-emerald-600 shadow-sm dark:bg-dark-secondary dark:text-emerald-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-dark-text-secondary dark:hover:text-white"
              }`}
            >
              <GooglePlayIcon className="h-4 w-4" />
              Android
            </button>
            <button
              type="button"
              onClick={() => setSelectedPlatform("ios")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                selectedPlatform === "ios"
                  ? "bg-white text-emerald-600 shadow-sm dark:bg-dark-secondary dark:text-emerald-400"
                  : "text-slate-600 hover:text-slate-900 dark:text-dark-text-secondary dark:hover:text-white"
              }`}
            >
              <AppleStoreIcon className="h-4 w-4" />
              iPhone / iOS
            </button>
          </div>

          {/* QR Code Canvas */}
          <div className="my-2 flex flex-col items-center justify-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-md dark:border-dark-border">
              <canvas ref={canvasRef} className="block rounded-lg" />
            </div>
            <p className="mt-3 text-xs text-slate-500 dark:text-dark-text-tertiary text-center">
              {selectedPlatform === "android"
                ? "Scan with your Android camera to open Google Play or download the APK"
                : "Scan with your iPhone camera to open in the Apple App Store"}
            </p>
          </div>

          {/* Direct Download Action Button */}
          <div className="mt-1 flex flex-col gap-2">
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              {selectedPlatform === "android" ? (
                <>
                  <Download className="h-4 w-4" />
                  Download Android App Directly
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" />
                  Open in Apple App Store
                </>
              )}
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
