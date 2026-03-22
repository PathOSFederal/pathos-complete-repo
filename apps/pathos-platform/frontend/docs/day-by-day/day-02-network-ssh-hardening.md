# Day 2 – Network, SSH Keys, and SSH Hardening

## Objective

Secure remote access to the server through SSH hardening, key-based authentication, and network configuration. Eliminate password-based SSH access and establish stable network identity.

## Key Tasks

- Configure stable IP address (static or DHCP reservation)
- Generate and deploy SSH key pairs for authorized users
- Disable root SSH login
- Disable password-based SSH authentication
- Adjust UFW rules for SSH access (port 22 or custom port)
- Document SSH configuration and key management procedures
- Test remote access with new configuration

## Use of GPT Assistants

Representative tasks included:

- Generating secure sshd_config templates
- Reviewing SSH hardening best practices
- Creating documentation for key rotation procedures

## Completion Criteria

- [ ] Stable IP address configured and documented
- [ ] SSH keys generated and deployed for all authorized users
- [ ] Root SSH login disabled in sshd_config
- [ ] Password authentication disabled in sshd_config
- [ ] UFW rules updated for SSH access
- [ ] Remote SSH access tested and verified with key-based auth
- [ ] Configuration documented in repository

## Validation Commands

```bash
# Verify SSH configuration
sudo sshd -T | grep -E "(permitrootlogin|passwordauthentication|pubkeyauthentication)"

# Check UFW rules for SSH
sudo ufw status numbered

# Test SSH connection (from client machine)
ssh -v <user>@<server-ip>

# Verify no password authentication is possible
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no <user>@<server-ip>
# (This should fail)

# Check SSH service status
sudo systemctl status sshd
```

## Notes and Decisions

- SSH keys are the only accepted authentication method after this day
- Key pairs should use Ed25519 or RSA 4096-bit minimum
- Consider using a non-standard SSH port for reduced noise (document if changed)
- All SSH configuration changes require a backup session before applying
- Failed SSH lockout scenarios should be documented with recovery procedures
- This hardening applies to the server layer; application-level auth is separate

