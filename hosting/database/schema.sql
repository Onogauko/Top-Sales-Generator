CREATE TABLE IF NOT EXISTS tsg_settings (
  k VARCHAR(50) NOT NULL PRIMARY KEY,
  v MEDIUMTEXT NOT NULL,
  updated_at INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tsg_login_attempts (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  attempted_at INT NOT NULL,
  KEY idx_ip_time (ip, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tsg_settings (k, v, updated_at) VALUES
('config', '{"divisions":{"GROCERY":["2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","5201","5202","5203","5204","5205"],"DND":["2025","2026","2027","2028","2029","2030"],"FISH":["2031","2032"],"MEAT":["2033","2034","2035","2036","5212"],"PRODUCE":["2037","2038","5213"],"DELICA":["2039","2040","5214"],"BAKERY":["2041","2042","5216"],"HBC":["2018","2019","2020","2021","2022","2023","5210","2024","2702","2703","2704","2705","2706","2707","5207","5208","5209","5701","5702","5703","5704","5705"],"NONFOODS":["2014","2015","2016","2017","2701","5206"]},"stores":[{"col":"M","name":""},{"col":"O","name":""},{"col":"Q","name":""},{"col":"S","name":""},{"col":"U","name":""},{"col":"W","name":""},{"col":"Y","name":""},{"col":"AA","name":""},{"col":"AC","name":""},{"col":"AE","name":""},{"col":"AG","name":""},{"col":"AI","name":""},{"col":"AK","name":""}]}', 1791514857),
('admin_password_hash', '$2y$10$69tT3XoNAuyu1H0uaqJpNeLZVG7btwWCxPDVOP76/mUMrmaar5VPu', 1791514857),
('admin_must_change', '1', 1791514857);
