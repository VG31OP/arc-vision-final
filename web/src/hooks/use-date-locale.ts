import { useState, useEffect } from "react";
import { enUS, Locale } from "date-fns/locale";
import * as locales from "date-fns/locale";
import { useTranslation } from "react-i18next";

// Map of locale codes to date-fns Locale objects
const localeMap: Record<string, Locale> = {
  hi: locales.hi,
  gu: locales.gu,
};

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  const [locale, setLocale] = useState<Locale>(enUS);

  useEffect(() => {
    if (i18n.language === "en") {
      setLocale(enUS);
      return;
    }

    const matchedLocale = localeMap[i18n.language];
    if (matchedLocale) {
      setLocale(matchedLocale);
    } else {
      setLocale(enUS);
    }
  }, [i18n.language]);

  return locale;
}
