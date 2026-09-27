package it.teamlab.visitwise.tenant;

/** The logged-in (or just registered) account, as returned by the API. Never contains the password hash. */
public record CurrentTenant(Long id, String name, String email) {

    static CurrentTenant from(Tenant tenant) {
        return new CurrentTenant(tenant.getId(), tenant.getName(), tenant.getEmail());
    }
}
