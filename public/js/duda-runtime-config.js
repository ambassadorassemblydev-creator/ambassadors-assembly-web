/**
 * Duda Runtime Configuration
 * ---------------------------
 * This file configures the Duda layout engine (d-js-runtime-flex-package).
 * The runtime reads these values at startup for asset paths, feature flags,
 * image sizing, and widget behaviour.
 *
 * Extracted from footer.ejs inline <script> to keep templates clean.
 */

window.INSITE = window.INSITE || {};
window.INSITE.device = "desktop";

// ── Runtime Common Properties ────────────────────────────────────────────────
window.rtCommonProps = {};
rtCommonProps["rt.ajax.ajaxScriptsFix"] = true;
rtCommonProps["rt.pushnotifs.sslframe.encoded"] = 'aHR0cHM6Ly97c3ViZG9tYWlufS5wdXNoLW5vdGlmcy5jb20=';
rtCommonProps["runtimecollector.url"] = 'https://rtc.multiscreensite.com';
rtCommonProps["performance.tabletPreview.removeScroll"] = 'false';
rtCommonProps["inlineEditGrid.snap"] = true;
rtCommonProps["popup.insite.cookie.ttl"] = '0.5';
rtCommonProps["rt.pushnotifs.force.button"] = true;
rtCommonProps["common.mapbox.token"] = '';
rtCommonProps["common.mapbox.js.override"] = false;
rtCommonProps["common.here.appId"] = '';
rtCommonProps["common.here.appCode"] = '';
rtCommonProps["isCoverage.test"] = false;
rtCommonProps["ecommerce.ecwid.script"] = 'https://app.multiscreenstore.com/script.js';

// Asset paths — pointed at local vendor files instead of Duda CDN
rtCommonProps["common.resources.dist.cdn"] = false;
rtCommonProps["common.build.dist.folder"] = 'production/6329';
rtCommonProps["common.resources.cdn.host"] = '';
rtCommonProps["common.resources.folder"] = '/js/vendor';

rtCommonProps["feature.flag.runtime.backgroundSlider.preload.slowly"] = true;
rtCommonProps["feature.flag.runtime.newAnimation.enabled"] = true;
rtCommonProps["feature.flag.runtime.newAnimation.jitAnimation.enabled"] = true;
rtCommonProps["feature.flag.sites.google.analytics.gtag"] = true;
rtCommonProps["feature.flag.runOnReadyNewTask"] = true;
rtCommonProps["isAutomation.test"] = false;
rtCommonProps["booking.cal.api.domain"] = 'api.cal.com';
rtCommonProps['common.mapsProvider'] = 'google';
rtCommonProps["google.places.key"] = '';
rtCommonProps['common.mapsProvider.version'] = '0.52.0';
rtCommonProps['common.geocodeProvider'] = 'google';
rtCommonProps['server.for.resources'] = '';
rtCommonProps['feature.flag.lazy.widgets'] = true;
rtCommonProps['feature.flag.single.wow'] = false;
rtCommonProps['feature.flag.disallowPopupsInEditor'] = true;
rtCommonProps['feature.flag.mark.anchors'] = true;
rtCommonProps['captcha.public.key'] = '';
rtCommonProps['captcha.invisible.public.key'] = '';
rtCommonProps["images.sizes.small"] = 160;
rtCommonProps["images.sizes.mobile"] = 640;
rtCommonProps["images.sizes.tablet"] = 1280;
rtCommonProps["images.sizes.desktop"] = 1920;
rtCommonProps["modules.resources.cdn"] = false;
rtCommonProps["import.images.storage.imageCDN"] = '/';
rtCommonProps["feature.flag.runtime.inp.threshold"] = 150;
rtCommonProps["feature.flag.performance.logs"] = false;
rtCommonProps["site.widget.form.captcha.type"] = 'g_recaptcha';
rtCommonProps["friendly.captcha.site.key"] = '';
rtCommonProps["cookiebot.mapbox.consent.category"] = 'marketing';
rtCommonProps["platform.monolith.personalization.dateTimeCondition.popupMsgAction.moveToclient.enabled"] = true;

// ── Runtime Feature Flags ────────────────────────────────────────────────────
window.rtFlags = {};
rtFlags["unsuspendEcwidStoreOnRuntime.enabled"] = true;
rtFlags["scripts.widgetCount.enabled"] = true;
rtFlags["fnb.animations.tracking.enabled"] = true;
rtFlags["ecom.ecwidNewUrlStructure.enabled"] = false;
rtFlags["ecom.ecwid.accountPage.emptyBaseUrl.enabled"] = true;
rtFlags["ecom.ecwid.pages.links.disable.listeners"] = true;
rtFlags["ecom.ecwid.storefrontV3.enabled"] = false;
rtFlags["ecom.ecwid.old.store.fix.facebook.share"] = true;
rtFlags["feature.flag.photo.gallery.exact.size"] = true;
rtFlags["geocode.search.localize"] = false;
rtFlags["feature.flag.runtime.newAnimation.asyncInit.setTimeout.enabled"] = false;
rtFlags["twitter.heightLimit.enabled"] = true;
rtFlags["runtime.lottieOverflow"] = false;
rtFlags["runtime.monitoring.sentry.ignoreErrors"] = "";
rtFlags["streamline.monolith.personalization.supportMultipleConditions.enabled"] = false;
rtFlags["flex.animation.design.panel.layout"] = true;
rtFlags["runtime.cwv.report.cls.enabled"] = false;
rtFlags["runtime.cwv.report.lcp.enabled"] = false;
rtFlags["contact.form.useActiveForm"] = true;
rtFlags["contact.form.custom.errors.enabled"] = false;
rtFlags["runtime.ssr.productStore.internal.observer"] = true;
rtFlags["runtime.ssr.productCustomizations"] = true;
rtFlags["runtime.ssr.runtime.filter-sort.newFilterSortWidgetWithOptions.enabled"] = true;
rtFlags["runtime.ssr.ssrSlider.jumpThreshold.enabled"] = true;
