# Day 1 – Server Bring-Up and Base Hardening

## Objective

Establish a secure, hardened Ubuntu server foundation for the PathOS infrastructure. This day focuses on initial server provisioning, user configuration, and baseline security measures.

## Key Tasks

- Install Ubuntu Server (LTS version) on target infrastructure
- Create a non-root sudo user for administrative tasks
- Configure UFW (Uncomplicated Firewall) with restrictive default rules
- Enable automatic security updates
- Document baseline server configuration
- Verify system is accessible and stable

## Use of GPT Assistants

Representative tasks included:

- Generating UFW rule templates for common services
- Reviewing hardening checklists against CIS benchmarks
- Drafting initial documentation structure

## Completion Criteria

- [ ] Ubuntu Server installed and booting cleanly
- [ ] Non-root sudo user created and tested
- [ ] UFW enabled with deny-by-default policy
- [ ] Automatic security updates configured
- [ ] Baseline documentation committed to repository
- [ ] Server accessible via console or initial network access

## Validation Commands

```bash
# Verify UFW status
sudo ufw status verbose

# Check sudo user configuration
sudo -l -U <username>

# Verify automatic updates are enabled
cat /etc/apt/apt.conf.d/20auto-upgrades

# Check system uptime and basic health
uptime
df -h
free -m
```

## Notes and Decisions

- This day establishes the server layer only; application code is not deployed yet
- UFW rules are intentionally restrictive and will be expanded in Day 2
- All configuration changes are documented before implementation
- The server baseline serves as the foundation for container runtime (Day 3)
- PathOS follows a defense-in-depth approach: each layer adds security independently

