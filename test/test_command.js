"use strict";

var expect		= require('expect.js');
var Command		= require('../bin/lib/command').Command;
var Command2	= require('commander').Command;
var rlutils		= require('../bin/lib/rlutils');

// 屏蔽错误
// 'optionMissingArgument|missingArgument|unknownOption|variadicArgNotLast'
// 	.split('|')
// 	.forEach(function(errType)
// 	{
// 		Command2.prototype[errType] = function()
// 		{
// 			throw new Error(errType);
// 		};
// 	});



describe('#command', function()
{
	it('#base', function()
	{
		var command = initCommand();

		expect(function(){testStrArgs(command, 'no_exists_cmd')})
			.to.throwError(/^otherCommandFire$/);
		expect(function(){testStrArgs(command, 'help')})
			.to.throwError(/^otherCommandFire$/);

		command.help();
		expect(function(){testStrArgs(command, 'help')})
			.to.throwError(/missing required argument/);

		expect(function(){testStrArgs(command, 'help list')})
			.to.throwError(/^No Defined Command, list$/);

		command.list().action(function(){});
		testStrArgs(command, 'help list');
		testStrArgs(command, 'help ls');

		expect(function(){testStrArgs(command, 'help list --options=xxx')})
			.to.throwError(/unknown option/);

		expect(function(){testStrArgs(command, 'list ./conf.js --clients=')})
			.to.throwError(/argument missing/);

		expect(function(){testStrArgs(command, 'list ./conf.js --clients')})
			.to.throwError(/argument missing/);
	});


	it('#list', function()
	{
		var command = initCommand();
		command.list()
			.action(function(conf_file, command)
			{
				var options = command.__clk_options__;
				expect(conf_file).to.be('./conf.js');
				expect(options.clients).to.be('client');
				expect(options.useAction).to.be(true);
			});

		testStrArgs(command, 'list ./conf.js --clients=client -a');
	});


	it('#run', function()
	{
		var command = initCommand();
		command.run()
			.action(function(conf_file, command)
			{
				var options = command.__clk_options__;
				expect(conf_file).to.be('./conf.js');
				expect(options.clients).to.be('client');
			});

		testStrArgs(command, 'run ./conf.js --clients=client');
	});


	it('#exec', function()
	{
		var command = initCommand();
		command.exec()
			.action(function(conf_file, action, command)
			{
				var options = command.__clk_options__;

				expect(conf_file).to.be('./conf.js');
				expect(action).to.be('action');
				expect(options.clients).to.be('client');
				expect(options.query).to.be('q');
				expect(options.body).to.be('b');
				expect(options.options).to.be('o');
			});

		testStrArgs(command, 'exec ./conf.js action --clients=client '
			+ '--query=q '
			+ '--body=b '
			+ '--options=o ');
	});


	describe('#options', function()
	{
		it('#--no-color', function()
		{
			var command = initCommand();
			command.list().action(function(){});

			rlutils.colors.enabled = true;
			testStrArgs(command, 'list ./conf.js --no-color');
			expect(rlutils.colors.enabled).to.be(false);
			rlutils.colors.enabled = false;
		});
	});


	describe('#anycmd', function()
	{
		it('#help1', function(done)
		{
			var command = new Command;
			command.anycmd();
			command.program.help = function()
				{
					done();
				};

			testStrArgs(command, 'no_exists_cmd');
		});

		it('#help2', function(done)
		{
			var command = new Command;
			command.anycmd();
			command.program.help = function()
				{
					done();
				};

			testStrArgs(command, 'no_exists_cmd something');
		});

		it('#ignore help cmd', function(done)
		{
			var command = new Command;
			command.anycmd();
			command.program.help = function()
				{
					done();
				};

			testStrArgs(command, 'no_exists_cmd help');
		});

		it('#run command', function()
		{
			var command = new Command;
			command.anycmd();

			command.program.help = function()
				{
					expect().fail();
				};

			command.exec()
				.action(function(conf_file, action, command)
				{
					var options = command.__clk_options__;
					expect(conf_file).to.be('./conf.js');
					expect(action).to.be('action');
					expect(options.query).to.be('q');
				});

			testStrArgs(command, './conf.js exec action --query=q');
		});
	});
});



function testStrArgs(command, str)
{
	command.program.parse(('node ./main '+str).split(/ +/));
}

function initCommand()
{
	var command = new Command;
	var program = command.program;

	program.command('*')
		.action(function()
		{
			throw new Error('otherCommandFire');
		});
	program.on('error', function(err)
		{
			throw err;
		});

	return command;
}
