package it.teamlab.visitwise.common;

import java.text.Normalizer;

/** Small text helpers shared by the import and the geocoding code. */
public final class Text {

    private Text() {
    }

    /** The text cut to {@code maxLength} characters, e.g. the length of its database column. */
    public static String truncate(String text, int maxLength) {
        return text.length() > maxLength ? text.substring(0, maxLength) : text;
    }

    /** "CITTÀ" -> "CITTA": accents removed, letters and case kept. */
    public static String withoutAccents(String text) {
        return Normalizer.normalize(text, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
    }
}
