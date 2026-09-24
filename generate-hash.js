import bcrypt from 'bcrypt';

const password = 'Admin0309'; // 例: SystemAdmin0309

bcrypt.hash(password, 10).then(hash => {
  console.log('ハッシュ化されたパスワード:');
  console.log(hash);
});