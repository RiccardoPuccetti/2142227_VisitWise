package it.teamlab.visitwise.planning.export;

import java.math.BigDecimal;
import java.time.LocalDate;

/** One planned visit as written in the Excel export: when, in which order and where the agent goes. */
record ExportVisit(
        String agent,
        LocalDate date,
        int slot,
        String customerName,
        String pointName,
        String address,
        String city,
        BigDecimal expectedRevenue,
        BigDecimal travelKm) { }
