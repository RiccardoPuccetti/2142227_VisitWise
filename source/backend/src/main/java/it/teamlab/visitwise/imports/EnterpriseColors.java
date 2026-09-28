package it.teamlab.visitwise.imports;

/** Enterprise colors must stay visible on the mostly white map (US-05; WCAG 1.4.11 asks 3:1 for graphics). */
final class EnterpriseColors {

    static final double MIN_CONTRAST = 3.0;

    private EnterpriseColors() {
    }

    /** WCAG contrast ratio of a {@code #RRGGBB} color against white, from 1 (white) to 21 (black). */
    static double contrastOnWhite(String hex) {
        double[] channels = new double[3];
        for (int i = 0; i < 3; i++) {
            double c = Integer.parseInt(hex.substring(1 + 2 * i, 3 + 2 * i), 16) / 255.0;
            channels[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        }
        double luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
        return 1.05 / (luminance + 0.05);
    }
}
