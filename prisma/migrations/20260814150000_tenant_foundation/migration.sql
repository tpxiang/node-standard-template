CREATE TABLE `tenants` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `tenants_code_key`(`code`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `tenants` (`id`, `code`, `name`, `status`, `created_at`, `updated_at`)
VALUES ('tenant_default', 'default', 'Default Tenant', 'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

ALTER TABLE `roles` ADD COLUMN `tenant_id` VARCHAR(191) NOT NULL DEFAULT 'tenant_default';
DROP INDEX `roles_name_key` ON `roles`;
CREATE UNIQUE INDEX `roles_tenant_id_name_key` ON `roles`(`tenant_id`, `name`);

ALTER TABLE `audit_logs` ADD COLUMN `tenant_id` VARCHAR(191) NOT NULL DEFAULT 'tenant_default';

CREATE TABLE `tenant_members` (
  `id` VARCHAR(191) NOT NULL,
  `tenant_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,
  UNIQUE INDEX `tenant_members_tenant_id_user_id_key`(`tenant_id`, `user_id`),
  INDEX `tenant_members_user_id_status_idx`(`user_id`, `status`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tenant_member_roles` (
  `member_id` VARCHAR(191) NOT NULL,
  `role_id` VARCHAR(191) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`member_id`, `role_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `tenant_members` (`id`, `tenant_id`, `user_id`, `status`, `created_at`, `updated_at`)
SELECT CONCAT('tm_', `id`), 'tenant_default', `id`, 'ACTIVE', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
FROM `users`;

INSERT INTO `tenant_member_roles` (`member_id`, `role_id`, `created_at`)
SELECT CONCAT('tm_', `user_id`), `role_id`, `created_at` FROM `user_roles`;

ALTER TABLE `roles` ADD CONSTRAINT `roles_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tenant_members` ADD CONSTRAINT `tenant_members_tenant_id_fkey` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tenant_members` ADD CONSTRAINT `tenant_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tenant_member_roles` ADD CONSTRAINT `tenant_member_roles_member_id_fkey` FOREIGN KEY (`member_id`) REFERENCES `tenant_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `tenant_member_roles` ADD CONSTRAINT `tenant_member_roles_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
