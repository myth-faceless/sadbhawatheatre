class ApiResponse {
    constructor(statusCode, message, success, data = null) {
      this.statusCode = statusCode;
      this.message = message;
      this.success = success;
      this.data = data;
    }
  
    static success(statusCode, message, data = null) {
      return new ApiResponse(statusCode, message, true, data);
    }
  
    static error(statusCode, message) {
      return new ApiResponse(statusCode, message, false);
    }
  }
  
  export { ApiResponse };