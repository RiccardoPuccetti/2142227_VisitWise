package it.teamlab.visitwise.tenant;

import java.sql.Timestamp;
import java.util.Date;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.web.authentication.rememberme.PersistentRememberMeToken;
import org.springframework.security.web.authentication.rememberme.PersistentTokenRepository;
import org.springframework.stereotype.Repository;

/**
 * Remember-me tokens in {@code persistent_logins} (changeset 005), the table layout of Spring's
 * {@code JdbcTokenRepositoryImpl}, plus {@link #removeSeries}: logout forgets one device, not the whole tenant.
 */
@Repository
public class RememberMeTokenRepository implements PersistentTokenRepository {

    private final JdbcTemplate jdbc;

    public RememberMeTokenRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void createNewToken(PersistentRememberMeToken token) {
        jdbc.update("INSERT INTO persistent_logins (username, series, token, last_used) VALUES (?, ?, ?, ?)",
                token.getUsername(), token.getSeries(), token.getTokenValue(), new Timestamp(token.getDate().getTime()));
    }

    @Override
    public void updateToken(String series, String tokenValue, Date lastUsed) {
        jdbc.update("UPDATE persistent_logins SET token = ?, last_used = ? WHERE series = ?",
                tokenValue, new Timestamp(lastUsed.getTime()), series);
    }

    @Override
    public PersistentRememberMeToken getTokenForSeries(String seriesId) {
        List<PersistentRememberMeToken> tokens = jdbc.query(
                "SELECT username, series, token, last_used FROM persistent_logins WHERE series = ?",
                (rs, row) -> new PersistentRememberMeToken(rs.getString(1), rs.getString(2), rs.getString(3),
                        rs.getTimestamp(4)),
                seriesId);
        return tokens.isEmpty() ? null : tokens.get(0);
    }

    /** Every remembered device of the tenant (password change, suspected cookie theft). */
    @Override
    public void removeUserTokens(String username) {
        jdbc.update("DELETE FROM persistent_logins WHERE username = ?", username);
    }

    /** One remembered device (logout). */
    public void removeSeries(String series) {
        jdbc.update("DELETE FROM persistent_logins WHERE series = ?", series);
    }
}
