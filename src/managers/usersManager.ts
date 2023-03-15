import User from '../models/user.js';

class usersManager {
    static async getByEmail(email: string) {
        return await User.findOne({ email: email });
    }
}

export default usersManager;