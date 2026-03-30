package com.vitabridge.cli;

import com.vitabridge.Application;
import com.vitabridge.model.AdminProfile;
import com.vitabridge.model.Role;
import com.vitabridge.model.User;
import com.vitabridge.repository.AdminProfileRepository;
import com.vitabridge.repository.UserRepository;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.Console;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;


public final class CreateAdminCli {

    private CreateAdminCli() {
    }

    public static void main(String[] args) {
        Options options;
        try {
            options = Options.parse(args);
        } catch (IllegalArgumentException ex) {
            System.err.println("ERROR: " + ex.getMessage());
            printUsage();
            System.exit(2);
            return;
        }

        int exitCode;
        try {
            exitCode = execute(options, args);
        } catch (Exception ex) {
            System.err.println("ERROR: " + ex.getMessage());
            ex.printStackTrace(System.err);
            exitCode = 1;
        }

        System.exit(exitCode);
    }

    private static int execute(Options options, String[] springArgs) {
        try (ConfigurableApplicationContext ctx = new SpringApplicationBuilder(Application.class)
                .web(WebApplicationType.NONE)
                .run(springArgs)) {

            UserRepository userRepository = ctx.getBean(UserRepository.class);
            AdminProfileRepository adminProfileRepository = ctx.getBean(AdminProfileRepository.class);
            PasswordEncoder passwordEncoder = ctx.getBean(PasswordEncoder.class);

            Optional<User> existing = userRepository.findByEmail(options.email);
            User user;

            // Handle delete
            if (options.delete) {
                if (existing.isEmpty()) {
                    System.err.println("ERROR: No user found with email " + options.email);
                    return 3;
                }
                userRepository.delete(existing.get());
                System.out.printf("SUCCESS: Deleted user (email=%s).%n", options.email);
                return 0;
            }

            if (existing.isPresent()) {
                if (!options.updateExisting) {
                    System.err.println("ERROR: A user with email already exists. Re-run with --update to modify it.");
                    return 3;
                }

                user = existing.get();
                user.setRole(Role.ADMIN);

                if (options.name != null) {
                    user.setName(options.name);
                }
                if (options.phone != null) {
                    user.setPhoneNumber(options.phone);
                }
                if (options.active != null) {
                    user.setIsActive(options.active);
                }
                if (options.password != null) {
                    user.setPassword(passwordEncoder.encode(options.password));
                }

                user = userRepository.save(user);
                
                // Ensure AdminProfile exists
                Optional<AdminProfile> adminProfile = adminProfileRepository.findByUserId(user.getId());
                if (adminProfile.isEmpty()) {
                    AdminProfile newProfile = new AdminProfile();
                    newProfile.setUser(user);
                    adminProfileRepository.save(newProfile);
                }
                
                System.out.printf("SUCCESS: Updated admin user (id=%s, email=%s, active=%s).%n",
                        user.getId(), user.getEmail(), user.getIsActive());
                return 0;
            }

            // Create new admin
            if (options.name == null || options.name.isBlank()) {
                System.err.println("ERROR: --name is required when creating a new admin.");
                return 2;
            }

            String password = options.password;
            if (password == null) {
                password = promptPassword();
                if (password == null || password.isBlank()) {
                    System.err.println("ERROR: Password is required. Provide --password or run in a real console.");
                    return 2;
                }
            }

            user = new User();
            user.setName(options.name);
            user.setEmail(options.email);
            user.setPhoneNumber(options.phone);
            user.setRole(Role.ADMIN);
            user.setIsActive(options.active != null ? options.active : Boolean.TRUE);
            user.setPassword(passwordEncoder.encode(password));

            user = userRepository.save(user);

            // Create AdminProfile
            AdminProfile adminProfile = new AdminProfile();
            adminProfile.setUser(user);
            adminProfileRepository.save(adminProfile);

            System.out.printf("SUCCESS: Created admin user (id=%s, email=%s, active=%s).%n",
                    user.getId(), user.getEmail(), user.getIsActive());

            return 0;
        }
    }

    private static String promptPassword() {
        Console console = System.console();
        if (console == null) {
            return null;
        }

        char[] pwd = console.readPassword("Enter admin password: ");
        if (pwd == null) {
            return null;
        }
        return new String(pwd);
    }

    private static void printUsage() {
        System.err.println();
        System.err.println("Usage:");
        System.err.println("  gradlew.bat createAdmin -Pemail=... -Pname=... -Ppassword=...");
        System.err.println();
        System.err.println("Or run the class directly (advanced):");
        System.err.println("  gradlew.bat -q classes");
        System.err.println("  java -cp <runtime-classpath> com.vitabridge.cli.CreateAdminCli --email=... --name=... --password=...");
        System.err.println();
        System.err.println("Options:");
        System.err.println("  --email=<email>         (required)");
        System.err.println("  --name=<name>           (required for create)");
        System.err.println("  --password=<password>   (required for create; optional for update)");
        System.err.println("  --phone=<phone>         (optional)");
        System.err.println("  --update                Update existing user if present");
        System.err.println("  --delete                Permanently delete the user with the given email (use with care)");
        System.err.println("  --activate              Set isActive=true");
        System.err.println("  --deactivate            Set isActive=false");
        System.err.println();
        System.err.println("Notes:");
        System.err.println("- This command uses your configured datasource from application.properties (PostgreSQL etc). Ensure DB is running.");
        System.err.println("- You can also pass Spring properties, e.g. --spring.datasource.url=... to point to a different DB.");
    }

    private static final class Options {
        private final String email;
        private final String name;
        private final String password;
        private final String phone;
        private final Boolean active;
        private final boolean updateExisting;
        private final boolean delete;

        private Options(String email, String name, String password, String phone, Boolean active, boolean updateExisting, boolean delete) {
            this.email = email;
            this.name = name;
            this.password = password;
            this.phone = phone;
            this.active = active;
            this.updateExisting = updateExisting;
            this.delete = delete;
        }

        static Options parse(String[] args) {
            Map<String, String> kv = new HashMap<>();
            boolean update = false;
            boolean delete = false;
            Boolean active = null;

            for (int i = 0; i < args.length; i++) {
                String arg = args[i];
                if ("--update".equals(arg)) {
                    update = true;
                    continue;
                }
                if ("--delete".equals(arg)) {
                    delete = true;
                    continue;
                }
                if ("--activate".equals(arg)) {
                    active = Boolean.TRUE;
                    continue;
                }
                if ("--deactivate".equals(arg)) {
                    active = Boolean.FALSE;
                    continue;
                }

                if (!arg.startsWith("--")) {
                    continue;
                }

                String key;
                String value;

                int eq = arg.indexOf('=');
                if (eq > 2) {
                    key = arg.substring(2, eq);
                    value = arg.substring(eq + 1);
                } else {
                    key = arg.substring(2);
                    if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
                        value = args[++i];
                    } else {
                        value = "";
                    }
                }

                kv.put(key.toLowerCase(Locale.ROOT), value);
            }

            String email = normalizeRequired(kv.get("email"), "--email is required");
            String name = normalizeOptional(kv.get("name"));
            String password = normalizeOptional(kv.get("password"));
            String phone = normalizeOptional(kv.get("phone"));

            return new Options(email, name, password, phone, active, update, delete);
        }

        private static String normalizeRequired(String value, String message) {
            String normalized = normalizeOptional(value);
            if (normalized == null) {
                throw new IllegalArgumentException(message);
            }
            return normalized;
        }

        private static String normalizeOptional(String value) {
            if (value == null) {
                return null;
            }
            String trimmed = value.trim();
            return trimmed.isEmpty() ? null : trimmed;
        }
    }
}
