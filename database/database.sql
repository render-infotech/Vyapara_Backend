CREATE DATABASE vyapara;

-- Created new table for all the users - by Shubham
CREATE TABLE IF NOT EXISTS `users` (
  `id` bigint NOT NULL AUTO_INCREMENT COMMENT 'ID of the users.',
  `first_name` varchar(50) NOT NULL COMMENT 'The first name of the user',
  `middle_name` varchar(50) DEFAULT NULL COMMENT 'The middle name of the user',
  `last_name` varchar(50) DEFAULT NULL COMMENT 'The last name of the user',
  `profile_pic` text DEFAULT NULL COMMENT 'The profile pic URL',
  `email` varchar(255) NOT NULL COMMENT 'Email ID of the user',
  `password` varchar(255) NOT NULL COMMENT 'Password of the user',
  `phone_country_code` varchar(10) DEFAULT NULL COMMENT 'The phone country code (IN, US, etc)',
  `phone_code` varchar(10) DEFAULT NULL COMMENT 'The phone code of the phone country',
  `phone` varchar(15) DEFAULT NULL COMMENT 'The phone number of the user',
  `role_id` bigint NOT NULL DEFAULT 1 COMMENT 'Role ID (1=Admin, 2=Vendor, 3=Rider, 10=End User, etc)',
  `status` tinyint(1) NOT NULL DEFAULT 1 COMMENT 'Is the user Active or Not',
  `is_deactivated` tinyint(1) NOT NULL DEFAULT 0 COMMENT 'To mark if user is deactivated',
  `user_verified` tinyint(1) DEFAULT 0 COMMENT 'Has the user KYC verified',
  `password_change_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when the password was last changed',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT 'Date and time when the record was created',
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Date and time when the record was last updated',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_email` (`email`),
  KEY `user_first_name` (`first_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Users list table';


