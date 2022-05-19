/// Handles everything user related

import Redis from './redis';
import {Entity, Schema} from 'redis-om';

class UserClass extends Entity {}

const UserSchema = new Schema(
	UserClass, {
		username: {type: 'string'},
		password: {type: 'string'},
		groups: {type: 'string[]'},
		data: {type: 'string'},
		secId: {type: 'number'},
	}
);

const userRepo = Redis.registerRepository(UserSchema);

function genSecId(){
	return Math.floor(Math.random() * 900000) + 100000;
}

async function registerUser({username, password, data}) {
	return userRepo.then((repo) => {
		return repo.createAndSave({
			username,
			password,
			data: JSON.stringify(data),
			secId: genSecId(),
		});
	});
}

async function searchUser(hashedUsername: string) {
	return userRepo.then((repo) => {
		return repo.search()
			.where('username').eq(hashedUsername)
			.returnFirst();
	});
}

async function deleteUser(hashedUsername: string) {
	return userRepo.then((repo) => {
		return repo.search().where('username')
			.eq(hashedUsername).returnFirst()
			.then((res) => {
				return repo.remove(res.entityId);
			});
	});
}

/// Checks if a user is registered. Rejects if not
async function isUserRegistered(hashedUsername: string) {
	return (await userRepo).search().where('username').eq(hashedUsername).returnAll()
		.then((users) => {
			if(users.length !== 1){
				throw new Error('User not registered');
			}
		});
}

async function getUserGroups(hashedUsername: string){
	return (await userRepo).search().where('username').eq(hashedUsername)
		.return.returnFirst().then((user) => {
			//@ts-ignore
			return user.groups;
		});
}
async function countUsers() {
	return (await userRepo).search().return.count();
}
const User = {
	registerUser,
	searchUser,
	deleteUser,
	isUserRegistered,
	getUserGroups,
	countUsers,
};
export default User;