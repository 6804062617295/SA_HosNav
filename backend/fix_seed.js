const bcrypt = require('bcryptjs');
const fs = require('fs');

async function fixSeed() {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('password123', salt);
    
    let seed = fs.readFileSync('../database/seed.sql', 'utf8');
    seed = seed.replace(/'hashed_password_admin'/g, `'${hash}'`);
    seed = seed.replace(/'hashed_password_staff'/g, `'${hash}'`);
    
    fs.writeFileSync('../database/seed.sql', seed);
    console.log("Fixed seed.sql with real bcrypt hashes!");
}
fixSeed();
