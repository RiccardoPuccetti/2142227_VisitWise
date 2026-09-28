package it.teamlab.visitwise.tenant;

/** API_CONTRACT.md: the tenant's starting base; every planned working day starts and ends here (US-35). */
public record StartingBase(String address, String city, double latitude, double longitude) { }
