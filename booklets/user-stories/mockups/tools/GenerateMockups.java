import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.Stroke;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.imageio.ImageIO;

/**
 * Generates the LoFi grayscale mockups S7-S10 of the planner screens (Marzella) as PNG files.
 * No Balsamiq source exists for these screens: this program is the source.
 *
 * Run from {@code booklets/user-stories/mockups/} with the JDK 21 used by the backend:
 *
 * <pre>java tools/GenerateMockups.java [outputDir]</pre>
 *
 * Every name and figure is synthetic (taken from {@code source/sample-data/generate_samples.py}); no NDA data.
 */
public class GenerateMockups {

    private static final int W = 1280;
    private static final int H = 900;

    private static final Color PAPER = Color.WHITE;
    private static final Color INK = new Color(0x33, 0x33, 0x33);
    private static final Color MUTED = new Color(0x88, 0x88, 0x88);
    private static final Color LINE = new Color(0xAA, 0xAA, 0xAA);
    private static final Color FILL = new Color(0xEE, 0xEE, 0xEE);
    private static final Color FILL_DARK = new Color(0xCC, 0xCC, 0xCC);
    private static final Color HIGHLIGHT = new Color(0xDD, 0xDD, 0xDD);

    private static final Font BASE = new Font(Font.SANS_SERIF, Font.PLAIN, 14);
    private static final Font SMALL = new Font(Font.SANS_SERIF, Font.PLAIN, 12);
    private static final Font BOLD = new Font(Font.SANS_SERIF, Font.BOLD, 14);
    private static final Font TITLE = new Font(Font.SANS_SERIF, Font.BOLD, 22);
    private static final Font H2 = new Font(Font.SANS_SERIF, Font.BOLD, 16);
    private static final Font KPI = new Font(Font.SANS_SERIF, Font.BOLD, 26);
    private static final Font NOTE = new Font(Font.SANS_SERIF, Font.ITALIC, 12);

    public static void main(String[] args) throws IOException {
        System.setProperty("java.awt.headless", "true");
        Path out = Path.of(args.length > 0 ? args[0] : ".");
        Files.createDirectories(out);
        write(out.resolve("S7-planner-parameters.png"), GenerateMockups::s7Parameters);
        write(out.resolve("S8-planner-result.png"), GenerateMockups::s8Result);
        write(out.resolve("S9-what-if.png"), GenerateMockups::s9WhatIf);
        write(out.resolve("S10-scenarios-compare.png"), GenerateMockups::s10Compare);
    }

    private interface Screen {
        void draw(Sketch s);
    }

    private static void write(Path file, Screen screen) throws IOException {
        BufferedImage image = new BufferedImage(W, H, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setColor(PAPER);
        g.fillRect(0, 0, W, H);
        screen.draw(new Sketch(g));
        g.dispose();
        ImageIO.write(image, "png", file.toFile());
        System.out.println("Written " + file);
    }

    // ---------------------------------------------------------------- screens

    private static void s7Parameters(Sketch s) {
        s.shell("S7 - Planner: parameters", "Visit planner", "Planner");

        int x = 40;
        int w = 560;
        s.card(x, 110, w, 200, "1. Starting point");
        s.label(x + 20, 165, "Address *");
        s.input(x + 20, 171, 300, "Via del Corso 300");
        s.label(x + 340, 165, "City *");
        s.input(x + 340, 171, 120, "Roma");
        s.button(x + 480, 170, 60, "Save", false);
        s.text(x + 20, 230, "Geocoded position: 41.9009, 12.4809  (pin shown on the map)", SMALL, MUTED);
        s.text(x + 20, 252, "or:  \"Address not found - check the address or fix the position on the map\"",
                SMALL, MUTED);
        s.note(x + 20, 270, w - 40, "Saved once per tenant (US-35): every plan of this federation starts here.");

        s.card(x, 330, w, 430, "2. Campaign and visits");
        s.label(x + 20, 385, "Campaign");
        s.chips(x + 20, 391, new String[] {"Christmas", "Easter", "End of summer", "Custom"}, 0);
        s.label(x + 20, 440, "Start date");
        s.input(x + 20, 448, 150, "02/11/2026");
        s.label(x + 200, 440, "Max working days *");
        s.input(x + 200, 448, 100, "20");
        s.label(x + 330, 440, "Deadline");
        s.input(x + 330, 448, 150, "19/12/2026");
        s.text(x + 20, 500, "Mon-Fri only, Italian public holidays excluded", SMALL, MUTED);

        s.label(x + 20, 525, "Enterprise weights (0 = exclude, > 1 = prioritize)");
        s.slider(x + 20, 545, 240, "Enterprise A", 0.5, "1.0");
        s.slider(x + 300, 545, 240, "Enterprise B", 0.5, "1.0");
        s.slider(x + 20, 585, 240, "Enterprise C", 0.75, "1.5");

        s.label(x + 300, 580, "Agents");
        s.checkbox(x + 300, 598, "AGENT NORTH", true);
        s.checkbox(x + 420, 598, "AGENT SOUTH", true);
        s.checkbox(x + 300, 620, "AGENT EAST", true);
        s.checkbox(x + 420, 620, "AGENT WEST", false);

        s.label(x + 20, 655, "Planning mode");
        s.select(x + 20, 663, 240, "Each agent, own route");

        s.collapsible(x + 20, 705, w - 40, "Advanced: visit 210 min, day 480 min, max 80 km, 25 km/h x 1.3, "
                + "2 EUR/km, min revenue 0", false);
        s.button(x + 20, 720, w - 40, "Simulate", true);

        s.card(640, 110, 600, 650, "Map");
        s.mapPlaceholder(660, 160, 560, 580, new int[][] {{280, 300}}, new int[][] {
                {120, 200}, {400, 180}, {230, 420}, {450, 380}, {330, 520}, {150, 330}, {500, 480}});
        s.text(680, 185, "Base pin after Save; customers of the import in gray", SMALL, MUTED);

        s.footerNotes(new String[] {
                "Simulate answers in under 2 s for the synthetic sample (deterministic planner, no solver).",
                "Required fields marked with *; the button stays disabled while the base is not geocoded.",
                "Campaign presets pre-fill start date and deadline for any year (Easter is computed)."});
    }

    private static void s8Result(Sketch s) {
        s.shell("S8 - Planner: result", "Visit planner", "Planner");

        String[][] kpis = {
                {"Planned visits", "38"}, {"Unique customers", "31"}, {"Covered revenue", "182 k EUR"},
                {"Coverage", "64 %"}, {"Total km", "412"}, {"Working days used", "20 / 20"}};
        int kx = 40;
        for (String[] kpi : kpis) {
            s.kpi(kx, 110, 190, kpi[0], kpi[1]);
            kx += 202;
        }
        s.warning(40, 200, 1200, "3 targets out of range (> 80 km from the base): VIA DEI CALZAIUOLI 30, FIRENZE "
                + "and 2 more   -   2 visits fall after the deadline (19/12/2026)");

        s.card(40, 250, 740, 300, "Days");
        String[] days = {"Mon 02/11", "Tue 03/11", "Wed 04/11", "Thu 05/11", "Fri 06/11"};
        s.chips(60, 290, days, 0);
        s.text(60 + 5 * 98, 309, "...  day 6-20", SMALL, MUTED);
        String[] agents = {"AGENT NORTH", "AGENT SOUTH", "AGENT EAST"};
        String[][] stops = {
                {"OSTERIA AURORA - VIA DEL CORSO 300", "HOTEL LE TERRAZZE - VIA NAZIONALE 75"},
                {"TRATTORIA DEL PORTO - VIA APPIA NUOVA 210", "BAR SAN MARCO - VIA TUSCOLANA 700"},
                {"ENOTECA LA PERGOLA - VIA NOMENTANA 250", "BISTROT IL GLICINE - VIA SALARIA 220"}};
        int y = 335;
        for (int i = 0; i < agents.length; i++) {
            s.text(60, y + 15, agents[i], BOLD, INK);
            s.timelineStop(200, y, 260, "09:00  " + stops[i][0], "3 h 30");
            s.timelineStop(480, y, 260, "13:15  " + stops[i][1], "3 h 30");
            s.text(200, y + 55, "Base -> 1 -> 2 -> base: 21 km, 1 h 05 travel, 8 h total", SMALL, MUTED);
            y += 70;
        }

        s.card(800, 250, 440, 300, "Map - Mon 02/11");
        s.mapPlaceholder(820, 295, 400, 235, new int[][] {{200, 120}}, new int[][] {
                {90, 60}, {330, 90}, {120, 200}, {300, 190}, {230, 60}, {60, 140}});
        s.polyline(new int[][] {{1020, 410}, {910, 350}, {1150, 380}, {1020, 410}});
        s.badge(830, 300, "road route  21.3 km  1 h 05");
        s.text(830, 545, "Badge reads \"estimate\" when OSRM is off (same Haversine model as the KPIs).",
                SMALL, MUTED);

        s.card(40, 570, 740, 190, "Valuable customers left out");
        s.table(60, 605, new int[] {300, 200, 110, 90},
                new String[] {"Customer", "Delivery point", "Revenue", "Reason"},
                new String[][] {
                        {"IL CAMINETTO SAS (71230)", "RISTORANTE BELVEDERE", "9 840 EUR", "no slot"},
                        {"LUNA ROSSA SRLS (72015)", "WINE BAR DEI FIORI", "7 210 EUR", "no slot"},
                        {"DEL SOLE SNC (73340)", "OSTERIA IL FARO (FIRENZE)", "6 950 EUR", "> 80 km"}});
        s.text(60, 748, "Top 20 by weighted value; the analyst can raise the horizon in the what-if page.",
                SMALL, MUTED);

        s.card(800, 570, 440, 190, "Save this plan as a scenario");
        s.label(820, 628, "Scenario name");
        s.input(820, 636, 400, "Christmas 2026 - 20 days");
        s.button(820, 680, 400, "Save scenario", true);
        s.text(820, 735, "Saved scenarios are compared side by side (S10).", SMALL, MUTED);

        s.footerNotes(new String[] {
                "Days are front-loaded: the most valuable day is the first working date.",
                "The road route is fetched only for the selected day (a handful of OSRM calls per session)."});
    }

    private static void s9WhatIf(Sketch s) {
        s.shell("S9 - What-if analysis", "What-if and scenarios", "What-if");

        s.card(40, 110, 1200, 100, "1. How many days are worth it?");
        s.label(60, 162, "Parameters from");
        s.select(60, 168, 260, "Campaign: Christmas");
        s.label(340, 162, "Horizons (working days)");
        s.chips(340, 168, new String[] {"10", "20", "30", "40", "60"}, -1);
        s.button(1040, 166, 180, "Run what-if", true);

        int[] horizons = {10, 20, 30, 40, 60};
        double[] coverage = {0.38, 0.61, 0.75, 0.84, 0.93};
        int[] revenueK = {108, 174, 214, 240, 265};
        s.card(40, 220, 700, 330, "Coverage curve - covered revenue vs working days");
        int cx = 100;
        int cy = 500;
        int cw = 600;
        int ch = 220;
        s.axes(cx, cy, cw, ch, "working days", "covered revenue");
        int[][] pts = new int[horizons.length][];
        for (int i = 0; i < horizons.length; i++) {
            int px = cx + (int) (cw * (horizons[i] / 65.0));
            int py = cy - (int) (ch * coverage[i]);
            pts[i] = new int[] {px, py};
            s.dot(px, py);
            s.text(px - 12, py - 14, horizons[i] + " d: " + (int) (coverage[i] * 100) + " %", SMALL, INK);
        }
        s.polyline(pts);
        s.dashedHorizontal(cx, cy - ch, cw, "100 % of eligible revenue");

        s.card(760, 220, 480, 330, "Marginal revenue of each extra block of days");
        int bx = 800;
        int by = 480;
        String[] blocks = {"0-10", "10-20", "20-30", "30-40", "40-60"};
        int[] marginal = {108, 66, 40, 26, 25};
        for (int i = 0; i < blocks.length; i++) {
            int bh = (int) (marginal[i] * 1.7);
            s.bar(bx + i * 85, by - bh, 60, bh, marginal[i] + " k");
            s.text(bx + i * 85 + 8, by + 18, blocks[i], SMALL, INK);
        }
        s.text(800, 530, "Diminishing returns: after 30 days each block adds less.", NOTE, MUTED);

        s.card(40, 570, 1200, 200, "Results per horizon");
        String[][] rows = new String[horizons.length][];
        for (int i = 0; i < horizons.length; i++) {
            rows[i] = new String[] {
                    horizons[i] + " days", String.valueOf(18 + i * 18), revenueK[i] + " k EUR",
                    (int) (coverage[i] * 100) + " %", (i == 0 ? "-" : "+" + marginal[i] + " k EUR"),
                    String.valueOf(200 + i * 190), horizons[i] <= 35 ? "no" : "yes"};
        }
        s.table(60, 605, new int[] {100, 130, 170, 120, 200, 110, 160},
                new String[] {"Horizon", "Planned visits", "Covered revenue", "Coverage", "Marginal revenue",
                        "Total km", "After deadline?"}, rows);

        s.footerNotes(new String[] {
                "One request runs the planner for every horizon with the same parameters; results are deterministic.",
                "Row click opens the planner (S8) with that horizon."});
    }

    private static void s10Compare(Sketch s) {
        s.shell("S10 - Scenarios compare", "What-if and scenarios", "What-if");

        s.card(40, 110, 1200, 90, "2. Saved scenarios");
        s.label(60, 162, "Compare");
        s.select(60, 168, 300, "Christmas 2026 - 20 days");
        s.select(380, 168, 300, "Christmas 2026 - 30 days");
        s.select(700, 168, 300, "Easter 2027 - 20 days");
        s.text(1020, 188, "2 to 3 scenarios", SMALL, MUTED);

        String[] columns = {"Christmas 2026 - 20 days", "Christmas 2026 - 30 days", "Easter 2027 - 20 days"};
        String[] labels = {"Start date", "Working days", "Planned visits", "Unique customers", "Covered revenue",
                "Coverage", "Total km", "Travel hours", "Last visit", "Visits after deadline", "Out of range"};
        String[][] values = {
                {"02/11/2026", "02/11/2026", "22/02/2027"},
                {"20", "30", "20"},
                {"38", "56", "38"},
                {"31", "44", "30"},
                {"182 k EUR", "224 k EUR", "179 k EUR"},
                {"64 %", "79 %", "63 %"},
                {"412", "605", "428"},
                {"16 h 30", "24 h 10", "17 h 05"},
                {"27/11/2026", "11/12/2026", "19/03/2027"},
                {"0", "2", "0"},
                {"3", "3", "3"}};
        String[][] diffs = {
                {"", "", ""},
                {"", "+10", ""},
                {"", "+18", ""},
                {"", "+13", "-1"},
                {"", "+42 k", "-3 k"},
                {"", "+15 pt", "-1 pt"},
                {"", "+193", "+16"},
                {"", "+7 h 40", "+35 min"},
                {"", "", ""},
                {"", "+2", ""},
                {"", "", ""}};

        int x0 = 40;
        int y0 = 220;
        int labelW = 240;
        int colW = 320;
        int rowH = 38;
        s.rect(x0, y0, labelW + 3 * colW, rowH * (labels.length + 1), PAPER);
        s.fillRect(x0, y0, labelW + 3 * colW, rowH, FILL);
        for (int c = 0; c < columns.length; c++) {
            s.text(x0 + labelW + c * colW + 12, y0 + 25, columns[c], BOLD, INK);
        }
        for (int r = 0; r < labels.length; r++) {
            int y = y0 + rowH * (r + 1);
            s.line(x0, y, x0 + labelW + 3 * colW, y);
            s.text(x0 + 12, y + 25, labels[r], BASE, INK);
            for (int c = 0; c < columns.length; c++) {
                int cx = x0 + labelW + c * colW;
                boolean changed = !diffs[r][c].isEmpty();
                if (changed) {
                    s.fillRect(cx + 1, y + 1, colW - 1, rowH - 1, HIGHLIGHT);
                }
                s.text(cx + 12, y + 25, values[r][c], changed ? BOLD : BASE, INK);
                if (changed) {
                    s.text(cx + 200, y + 25, diffs[r][c] + " vs first", SMALL, INK);
                }
            }
        }
        for (int c = 0; c <= columns.length; c++) {
            int cx = x0 + labelW + c * colW;
            s.line(cx, y0, cx, y0 + rowH * (labels.length + 1));
        }

        int by = y0 + rowH * (labels.length + 1) + 20;
        s.text(x0, by + 15, "Customers visited only in one scenario:", BOLD, INK);
        s.text(x0, by + 38, "30 days adds: ARCOBALENO SRL (70918), LA LANTERNA SNC (71744), DEI FIORI SAS (72610) "
                + "and 10 more", SMALL, INK);
        s.text(x0, by + 58, "Easter drops: IL GIARDINO SRLS (73102)", SMALL, INK);
        for (int c = 0; c < columns.length; c++) {
            int cx = x0 + labelW + c * colW;
            s.button(cx + 12, by + 75, 130, "Open plan", false);
            s.button(cx + 160, by + 75, 100, "Delete", false);
        }

        s.footerNotes(new String[] {
                "Shaded cells differ from the first scenario; the difference is written next to the value.",
                "\"Open plan\" leads to the agent plan page (S11) of that scenario."});
    }

    // ---------------------------------------------------------------- drawing primitives

    private static final class Sketch {
        private final Graphics2D g;

        Sketch(Graphics2D g) {
            this.g = g;
            g.setStroke(new BasicStroke(1.5f));
        }

        void shell(String mockupTitle, String pageTitle, String activeNav) {
            fillRect(0, 0, W, 50, FILL_DARK);
            text(20, 32, "VisitWise", TITLE, INK);
            String[] nav = {"Imports", "Map", "Planner", "What-if"};
            int nx = 200;
            for (String item : nav) {
                boolean active = item.equals(activeNav);
                text(nx, 32, item, active ? BOLD : BASE, INK);
                if (active) {
                    line(nx, 40, nx + g.getFontMetrics(BOLD).stringWidth(item), 40);
                }
                nx += 110;
            }
            text(W - 300, 32, "Federation Demo  |  demo@visitwise.local", SMALL, INK);
            text(40, 90, pageTitle, TITLE, INK);
            String stamp = mockupTitle + " - LoFi mockup";
            text(W - 40 - g.getFontMetrics(SMALL).stringWidth(stamp), 90, stamp, SMALL, MUTED);
        }

        void card(int x, int y, int w, int h, String title) {
            rect(x, y, w, h, PAPER);
            text(x + 20, y + 30, title, H2, INK);
            line(x + 20, y + 40, x + w - 20, y + 40);
        }

        void kpi(int x, int y, int w, String label, String value) {
            rect(x, y, w, 75, PAPER);
            text(x + 12, y + 22, label, SMALL, MUTED);
            text(x + 12, y + 58, value, KPI, INK);
        }

        void warning(int x, int y, int w, String message) {
            fillRect(x, y, w, 34, FILL);
            rect(x, y, w, 34, PAPER, false);
            text(x + 12, y + 22, "!  " + message, SMALL, INK);
        }

        void label(int x, int y, String label) {
            text(x, y, label, SMALL, MUTED);
        }

        void input(int x, int y, int w, String value) {
            rect(x, y, w, 30, PAPER);
            text(x + 8, y + 20, value, BASE, INK);
        }

        void select(int x, int y, int w, String value) {
            input(x, y, w, value);
            text(x + w - 18, y + 20, "v", BOLD, MUTED);
        }

        void button(int x, int y, int w, String label, boolean primary) {
            fillRect(x, y, w, 32, primary ? FILL_DARK : FILL);
            rect(x, y, w, 32, PAPER, false);
            int tw = g.getFontMetrics(BOLD).stringWidth(label);
            text(x + (w - tw) / 2, y + 21, label, BOLD, INK);
        }

        void chips(int x, int y, String[] items, int selected) {
            int cx = x;
            for (int i = 0; i < items.length; i++) {
                int w = g.getFontMetrics(BASE).stringWidth(items[i]) + 24;
                fillRect(cx, y, w, 28, i == selected ? FILL_DARK : PAPER);
                rect(cx, y, w, 28, PAPER, false);
                text(cx + 12, y + 19, items[i], i == selected ? BOLD : BASE, INK);
                cx += w + 8;
            }
        }

        void slider(int x, int y, int w, String label, double position, String value) {
            text(x, y, label + "  " + value, SMALL, INK);
            line(x, y + 14, x + w, y + 14);
            int kx = x + (int) (w * position);
            fillOval(kx - 7, y + 7, 14, 14, FILL_DARK);
            g.setColor(INK);
            g.drawOval(kx - 7, y + 7, 14, 14);
        }

        void checkbox(int x, int y, String label, boolean checked) {
            rect(x, y, 14, 14, PAPER);
            if (checked) {
                text(x + 2, y + 12, "x", BOLD, INK);
            }
            text(x + 22, y + 12, label, SMALL, INK);
        }

        void collapsible(int x, int y, int w, String label, boolean open) {
            text(x, y, clip((open ? "v  " : ">  ") + label, w, SMALL), SMALL, MUTED);
            line(x, y + 6, x + w, y + 6);
        }

        void note(int x, int y, int w, String message) {
            Stroke old = g.getStroke();
            g.setStroke(new BasicStroke(1f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 1f,
                    new float[] {4f, 4f}, 0f));
            g.setColor(LINE);
            g.drawRect(x, y, w, 26);
            g.setStroke(old);
            text(x + 8, y + 18, message, NOTE, MUTED);
        }

        void footerNotes(String[] notes) {
            int y = H - 20 - 18 * notes.length;
            line(40, y - 12, W - 40, y - 12);
            for (String note : notes) {
                text(40, y, "Note: " + note, NOTE, MUTED);
                y += 18;
            }
        }

        void mapPlaceholder(int x, int y, int w, int h, int[][] base, int[][] customers) {
            fillRect(x, y, w, h, FILL);
            rect(x, y, w, h, PAPER, false);
            g.setColor(LINE);
            for (int i = 1; i < 6; i++) {
                g.drawLine(x, y + i * h / 6, x + w, y + i * h / 6);
                g.drawLine(x + i * w / 6, y, x + i * w / 6, y + h);
            }
            for (int[] c : customers) {
                fillOval(x + c[0] - 5, y + c[1] - 5, 10, 10, FILL_DARK);
                g.setColor(INK);
                g.drawOval(x + c[0] - 5, y + c[1] - 5, 10, 10);
            }
            for (int[] b : base) {
                g.setColor(INK);
                g.fillPolygon(new int[] {x + b[0], x + b[0] - 8, x + b[0] + 8},
                        new int[] {y + b[1], y + b[1] - 18, y + b[1] - 18}, 3);
                fillOval(x + b[0] - 8, y + b[1] - 26, 16, 16, INK);
            }
            text(x + w - 130, y + h - 8, "(c) OpenStreetMap", SMALL, MUTED);
        }

        void timelineStop(int x, int y, int w, String label, String duration) {
            fillRect(x, y, w, 40, FILL);
            rect(x, y, w, 40, PAPER, false);
            text(x + 8, y + 17, clip(label, w - 16, SMALL), SMALL, INK);
            text(x + 8, y + 33, duration, SMALL, MUTED);
        }

        void badge(int x, int y, String label) {
            int w = g.getFontMetrics(SMALL).stringWidth(label) + 20;
            fillRect(x, y, w, 22, FILL_DARK);
            text(x + 10, y + 16, label, SMALL, INK);
        }

        void table(int x, int y, int[] widths, String[] header, String[][] rows) {
            int total = 0;
            for (int w : widths) {
                total += w;
            }
            int rowH = 26;
            fillRect(x, y, total, rowH, FILL);
            rect(x, y, total, rowH * (rows.length + 1), PAPER, false);
            int cx = x;
            for (int c = 0; c < header.length; c++) {
                text(cx + 8, y + 18, header[c], BOLD, INK);
                cx += widths[c];
            }
            for (int r = 0; r < rows.length; r++) {
                int ry = y + rowH * (r + 1);
                line(x, ry, x + total, ry);
                cx = x;
                for (int c = 0; c < rows[r].length; c++) {
                    text(cx + 8, ry + 18, clip(rows[r][c], widths[c] - 16, SMALL), SMALL, INK);
                    cx += widths[c];
                }
            }
        }

        void axes(int x, int y, int w, int h, String xLabel, String yLabel) {
            line(x, y, x + w, y);
            line(x, y, x, y - h);
            text(x + w - g.getFontMetrics(SMALL).stringWidth(xLabel), y + 34, xLabel, SMALL, MUTED);
            text(x + 6, y - h - 6, yLabel, SMALL, MUTED);
            for (int d = 10; d <= 60; d += 10) {
                int tx = x + (int) (w * (d / 65.0));
                line(tx, y, tx, y + 4);
                text(tx - 6, y + 18, String.valueOf(d), SMALL, MUTED);
            }
        }

        void dot(int x, int y) {
            fillOval(x - 5, y - 5, 10, 10, INK);
        }

        void polyline(int[][] points) {
            g.setColor(INK);
            Stroke old = g.getStroke();
            g.setStroke(new BasicStroke(2.5f));
            for (int i = 1; i < points.length; i++) {
                g.drawLine(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
            }
            g.setStroke(old);
        }

        void dashedHorizontal(int x, int y, int w, String label) {
            Stroke old = g.getStroke();
            g.setStroke(new BasicStroke(1f, BasicStroke.CAP_BUTT, BasicStroke.JOIN_MITER, 1f,
                    new float[] {6f, 6f}, 0f));
            g.setColor(MUTED);
            g.drawLine(x, y, x + w, y);
            g.setStroke(old);
            text(x + 200, y - 6, label, SMALL, MUTED);
        }

        void bar(int x, int y, int w, int h, String label) {
            fillRect(x, y, w, h, FILL_DARK);
            rect(x, y, w, h, PAPER, false);
            text(x + 8, y - 6, label, SMALL, INK);
        }

        void rect(int x, int y, int w, int h, Color fill) {
            rect(x, y, w, h, fill, true);
        }

        void rect(int x, int y, int w, int h, Color fill, boolean paint) {
            if (paint) {
                fillRect(x, y, w, h, fill);
            }
            g.setColor(LINE);
            g.drawRect(x, y, w, h);
        }

        void fillRect(int x, int y, int w, int h, Color color) {
            g.setColor(color);
            g.fillRect(x, y, w, h);
        }

        void fillOval(int x, int y, int w, int h, Color color) {
            g.setColor(color);
            g.fillOval(x, y, w, h);
        }

        void line(int x1, int y1, int x2, int y2) {
            g.setColor(LINE);
            g.drawLine(x1, y1, x2, y2);
        }

        void text(int x, int y, String text, Font font, Color color) {
            g.setFont(font);
            g.setColor(color);
            g.drawString(text, x, y);
        }

        private String clip(String text, int maxWidth, Font font) {
            FontMetrics fm = g.getFontMetrics(font);
            if (fm.stringWidth(text) <= maxWidth) {
                return text;
            }
            String clipped = text;
            while (clipped.length() > 1 && fm.stringWidth(clipped + "...") > maxWidth) {
                clipped = clipped.substring(0, clipped.length() - 1);
            }
            return clipped + "...";
        }
    }
}
