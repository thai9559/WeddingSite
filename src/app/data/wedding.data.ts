import { WeddingInput } from "@/app/types/wedding";

export const weddingInput: WeddingInput = {
    base: "/albums/wedding",
    gallery: [
        { id: 1, file: "1.jpg", caption: "Khoảnh khắc đầu tiên gặp nhau bên khung cửa sổ mùa thu." },
        { id: 2, file: "2.jpg", caption: "Lời tỏ tình nhẹ như gió, nhưng làm tim rung động thật lâu." },
        { id: 3, file: "3.jpg", caption: "Bàn tay nắm chặt hứa hẹn đi cùng nhau suốt chặng đường." },
        { id: 4, file: "4.jpg", caption: "Nụ cười của em là ánh nắng đẹp nhất trong ngày." },
        { id: 5, file: "5.jpg", caption: "Bố mẹ nhìn theo, mắt rưng rưng mà đầy tự hào." },
        { id: 6, file: "6.jpg", caption: "Bạn bè quây quần, kể lại những kỷ niệm không thể quên." },
        { id: 7, file: "7.jpg", caption: "Điệu nhảy đầu tiên, chậm rãi mà ấm áp." },
        { id: 8, file: "8.jpg", caption: "Pháo hoa bừng sáng, mở đầu cho hành trình mới." },
        { id: 9, file: "9.jpg", caption: "Pháo hoa bừng sáng, mở đầu cho hành trình mới." },
        { id: 10, file: "10.jpg", caption: "Pháo hoa bừng sáng, mở đầu cho hành trình mới." },
        { id: 11, file: "11.jpg", caption: "Pháo hoa bừng sáng, mở đầu cho hành trình mới." },
        { id: 12, file: "12.jpg", caption: "Pháo hoa bừng sáng, mở đầu cho hành trình mới." },


    ],
    albums: [
        {
            key: "dam-hoi",
            title: "Đám hỏi",
            range: [9, 18],
            description: "Những nghi lễ đính hôn và khoảnh khắc ra mắt hai họ trang trọng nhưng đầy ấm áp.",
        },
        {
            key: "le-cuoi",
            title: "Lễ cưới",
            range: [17, 26],
            description: "Bước vào lễ đường, trao nhau lời thề nguyện và nụ cười rạng rỡ trong ngày trọng đại.",
        },
        {
            key: "gia-dinh",
            title: "Gia đình",
            range: [19, 28],
            description: "Khung hình bình yên bên cha mẹ và người thân – nơi tình yêu bắt đầu và tiếp nối.",
        },
        {
            key: "ban-be",
            title: "Bạn bè",
            range: [19, 28],
            description: "Tiếng cười rộn ràng, lời chúc chân thành và những trò nghịch đáng nhớ của hội bạn.",
        },
    ],
};
