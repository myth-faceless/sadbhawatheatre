export const getTokenFromRequest = (req) => {
    const tokenFromCookies = req.cookies?.accessToken;
    const tokenFromHeader = req.header("Authorization")?.replace("Bearer ", "");
    const token = tokenFromCookies?.accessToken || tokenFromHeader;
    return token;
  };