const maps = [
    {
        data: [
            ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'W', 'W', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', ' ', '-', ' ', '-', '-', '-', '-', ' ', '-', '-', ' ', '-', ' ', '-', '-'],
            ['-', ' ', '-', ' ', '-', ' ', '-', ' ', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', '-', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', '-', '-', ' ', '-', '-', ' ', '-', ' ', ' ', '-', ' ', '-', '-', ' ', '-', '-', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', '-', ' ', '-', ' ', '-', '-', '-', '-', ' ', '-', '-', ' ', '-', ' ', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', 'I', 'I', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
        ],
        radius: 0.01
    },
    {
        data: [
            ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ['I', ' ', ' ', ' ', ' ', '-', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', ' ', ' ', '-', ' ', '-', ' ', ' ', '-', '-', '-', '-', ' ', '-', ' ', ' ', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', '-', '-', ' ', '-', '-', ' ', ' ', ' ', '-', '-', '-', ' ', '-', '-', ' ', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', ' ', '-', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', ' ', '-', ' ', '-', ' ', '-', ' ', '-', ' ', ' ', ' ', '-', ' ', ' ', '-', ' ', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', ' ', '-', '-', '-', '-', ' ', '-', ' ', '-', '-', '-', ' ', '-', ' ', ' ', '-'],
            ['-', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'W', '-'],
        ],
        radius: 0.015
    },
    {
        data: [
            ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', '-', '-', '-', '-', '-', ' ', '-', ' ', '-', '-', '-', '-', '-', ' ', '-'],
            ['-', ' ', ' ', ' ', '-', ' ', ' ', '-', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', '-', '-', ' ', ' ', ' ', ' ', '-', '-', '-', '-', '-', ' ', ' ', '-', '-', ' ', '-'],
            ['-', ' ', '-', '-', '-', '-', ' ', ' ', ' ', '-', ' ', ' ', ' ', '-', '-', ' ', ' ', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', '-', ' ', '-', '-'],
            ['-', ' ', '-', '-', '-', '-', '-', '-', '-', '-', ' ', '-', '-', '-', '-', '-', '-', '-'],
            ['I', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', ' ', '-', ' ', ' ', 'W'],
            ['-', '-', '-', ' ', ' ', ' ', ' ', '-', '-', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', '-', '-', '-', ' ', '-', ' ', '-', ' ', ' ', '-', '-', ' ', '-', '-', '-'],
            ['-', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', '-', '-', '-', ' ', '-', ' ', '-', '-', '-', '-', ' ', '-', '-', '-', '-', '-', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-']
        ],
        radius: 0.02
    },
    {
        data: [
            ['-', 'I', 'I', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-'],
            ['-', ' ', ' ', '-', ' ', ' ', '-', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', '-', '-', ' ', '-', ' ', '-'],
            ['-', ' ', ' ', '-', ' ', '-', ' ', '-', '-', '-', ' ', '-', ' ', ' ', '-', ' ', '-', ' ', '-'],
            ['-', '-', ' ', '-', ' ', '-', ' ', ' ', '-', ' ', ' ', '-', ' ', ' ', '-', ' ', '-', ' ', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', '-', ' ', '-'],
            ['-', ' ', '-', '-', ' ', ' ', '-', '-', '-', '-', '-', ' ', ' ', '-', '-', ' ', '-', ' ', '-'],
            ['-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', ' ', '-', '-', '-', ' ', '-', '-', '-', '-', '-', '-','-', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', ' ', ' ', '-', ' ', ' ', ' ', ' ', ' ', '-', ' ', ' ', ' ', ' ', '-', '-', '-'],
            ['-', ' ', '-', ' ', ' ', '-', ' ', ' ', ' ', '-', '-', '-', '-', '-', ' ', ' ', ' ', ' ', '-'],
            ['-', ' ', '-', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', 'W'],
            ['-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', '-', 'W', 'W'],
        ],
        radius: 0.025
    },
]

export default maps;
