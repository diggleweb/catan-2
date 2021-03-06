/*
 * Data in this module is intended to be read only
 */
module.exports = {
    tileIdLayout:  [[2, 3, 4], [1, 13, 14, 5],
        [0, 12, 18, 15, 6], [11, 17, 16, 7],
        [10, 9, 8]],

    tileAdjacencyMap: {
        '-18': [0, 1],
        '-17': [1, 2],
        '-16': [2],
        '-15': [2, 3],
        '-14': [3, 4],
        '-13': [4],
        '-12': [4, 5],
        '-11': [5, 6],
        '-10': [6],
        '-9': [6, 7],
        '-8': [7, 8],
        '-7': [8],
        '-6': [8, 9],
        '-5': [9, 10],
        '-4': [10],
        '-3': [10, 11],
        '-2': [0, 11],
        '-1': [0],
        0: [1, 12, 11, -2, -1, -18],
        1: [2, 13, 12, 0, -18, -17],
        2: [-15, 3, 13, 1, -17, -16],
        3: [-14, 4, 14, 13, 2, -15],
        4: [-13, -12, 5, 14, 3, -14],
        5: [-12, -11, 6, 15, 14, 4],
        6: [-11, -10, -9, 7, 15, 5],
        7: [6, -9, -8, 8, 16, 15],
        8: [7, -8, -7, -6, 9, 16],
        9: [16, 8, -6, -5, 10, 17],
        10: [17, 9, -5, -4, -3, 11],
        11: [12, 17, 10, -3, -2, 0],
        12: [13, 18, 17, 11, 0, 1],
        13: [3, 14, 18, 12, 1, 2],
        14: [4, 5, 15, 18, 13, 3],
        15: [5, 6, 7, 16, 18, 14],
        16: [15, 7, 8, 9, 17, 18],
        17: [18, 16, 9, 10, 11, 12],
        18: [14, 15, 16, 17, 12, 13]
    },

    intersections: [
        "-16,-15,2",
        "-15,2,3",
        "2,3,13",
        "1,2,13",
        "-17,1,2",
        "-17,-16,2",
        "-15,-14,3",
        "-14,3,4",
        "3,4,14",
        "3,13,14",
        "-14,-13,4",
        "-13,-12,4",
        "-12,4,5",
        "4,5,14",
        "1,12,13",
        "0,1,12",
        "-18,0,1",
        "-18,-17,1",
        "13,14,18",
        "12,13,18",
        "5,14,15",
        "14,15,18",
        "-12,-11,5",
        "-11,5,6",
        "5,6,15",
        "0,11,12",
        "-2,0,11",
        "-2,-1,0",
        "-18,-1,0",
        "12,17,18",
        "11,12,17",
        "15,16,18",
        "16,17,18",
        "6,7,15",
        "7,15,16",
        "-11,-10,6",
        "-10,-9,6",
        "-9,6,7",
        "10,11,17",
        "-3,10,11",
        "-3,-2,11",
        "9,16,17",
        "9,10,17",
        "7,8,16",
        "8,9,16",
        "-9,-8,7",
        "-8,7,8",
        "-5,9,10",
        "-5,-4,10",
        "-4,-3,10",
        "-6,8,9",
        "-6,-5,9",
        "-8,-7,8",
        "-7,-6,8",
    ],

    edges: [
        ["-18,-1,0","-18,0,1"], ["-18,0,1","0,1,12"], ["0,1,12","0,11,12"],
        ["0,11,12","-2,0,11"], ["-2,0,11","-2,-1,0"], ["-2,-1,0","-18,-1,0"],
        ["-18,0,1","-18,-17,1"], ["-18,-17,1","-17,1,2"], ["-17,1,2","1,2,13"],
        ["1,2,13","1,12,13"], ["1,12,13","0,1,12"], ["-17,1,2","-17,-16,2"],
        ["-17,-16,2","-16,-15,2"], ["-16,-15,2","-15,2,3"], ["-15,2,3","2,3,13"],
        ["2,3,13","1,2,13"], ["-15,2,3","-15,-14,3"], ["-15,-14,3","-14,3,4"],
        ["-14,3,4","3,4,14"], ["3,4,14","3,13,14"], ["3,13,14","2,3,13"],
        ["-14,3,4","-14,-13,4"], ["-14,-13,4","-13,-12,4"], ["-13,-12,4","-12,4,5"],
        ["-12,4,5","4,5,14"], ["4,5,14","3,4,14"], ["-12,4,5","-12,-11,5"],
        ["-12,-11,5","-11,5,6"], ["-11,5,6","5,6,15"], ["5,6,15","5,14,15"],
        ["5,14,15","4,5,14"], ["-11,5,6","-11,-10,6"], ["-11,-10,6","-10,-9,6"],
        ["-10,-9,6","-9,6,7"], ["-9,6,7","6,7,15"], ["6,7,15","5,6,15"],
        ["-9,6,7","-9,-8,7"], ["-9,-8,7","-8,7,8"], ["-8,7,8","7,8,16"],
        ["7,8,16","7,15,16"], ["7,15,16","6,7,15"], ["-8,7,8","-8,-7,8"],
        ["-8,-7,8","-7,-6,8"],["-7,-6,8","-6,8,9"],["-6,8,9","8,9,16"],
        ["8,9,16","7,8,16"],["-6,8,9","-6,-5,9"],["-6,-5,9","-5,9,10"],
        ["-5,9,10","9,10,17"],["9,10,17","9,16,17"],["9,16,17","8,9,16"],
        ["-5,9,10","-5,-4,10"],["-5,-4,10","-4,-3,10"],["-4,-3,10","-3,10,11"],
        ["-3,10,11","10,11,17"],["10,11,17","9,10,17"],["-3,10,11","-3,-2,11"],
        ["-3,-2,11","-2,0,11"],["0,11,12","11,12,17"],["11,12,17","10,11,17"],
        ["1,12,13","12,13,18"],["12,13,18","12,17,18"],["12,17,18","11,12,17"],
        ["3,13,14","13,14,18"],["13,14,18","12,13,18"],["13,14,18","14,15,18"],
        ["14,15,18","5,14,15"],["14,15,18","15,16,18"],["15,16,18","7,15,16"],
        ["15,16,18","16,17,18"],["16,17,18","9,16,17"],["16,17,18","12,17,18"]
    ]
};
