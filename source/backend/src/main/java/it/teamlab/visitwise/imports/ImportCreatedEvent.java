package it.teamlab.visitwise.imports;

/** Published after an import is committed, so background work (geocoding) sees its rows. */
public record ImportCreatedEvent(Long importId) { }
