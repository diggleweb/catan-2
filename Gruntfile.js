module.exports = function (grunt) {
    grunt.initConfig({
        jshint: {
            all: ['app.js', 'app/*.js', 'public/js/*.js'],
            options: {
                curly: true,
                eqeqeq: true,
                immed: true,
                newcap: true,
                noarg: true,
                sub: true,
                undef: true,
                unused: true,
                boss: true,
                eqnull: true,
                browser: true,
                globals: {
                    require: true,
                    describe: true,
                    it: true,
                    _: true,
                    $: true,
                    __dirname: true
                }
            },
        },
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['test/**/*.js']
            }
        },
        browserify: {
            dist: {
                src: ['public/js/soc.js'],
                dest: 'public/bundle.js'
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-browserify');
    grunt.registerTask('default', ['jshint', 'mochaTest', 'browserify']);
};
