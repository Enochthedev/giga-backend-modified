class ApiResponse<T> {
    public status: number;
    public data: T;

    constructor(status: number, data: T) {
        this.status = status;
        this.data = data;
    }
}



export default ApiResponse;