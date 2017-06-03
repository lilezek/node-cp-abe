VAGRANTFILE_API_VERSION = "2"
DEFAULT_BOX = "ubuntu/trusty64"

ENV["LC_ALL"] = "en_US.UTF-8"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

    config.vm.define("NodeCPABE") do |ncpabe|
        ncpabe.vm.box = DEFAULT_BOX
        ncpabe.vm.provider "virtualbox" do |v|
            v.name = "NodeCPABE"
            v.customize ["modifyvm", :id, "--memory", 512]
        end

        ncpabe.vm.provision "update", type: :shell do |shell|
            shell.inline = "apt-get -y -q update"
        end

        ncpabe.vm.provision "install_htop", type: :shell do |shell|
            shell.inline = "apt-get -y -q install htop"
        end

        ncpabe.vm.provision "install_node", type: :shell do |shell|
            shell.inline = "
            cd ~;
            wget --no-check-certificate https://nodejs.org/dist/v7.2.0/node-v7.2.0-linux-x64.tar.gz;
            cd /usr/local;
            tar --strip-components 1 -xzf ~/node-v7.2.0-linux-x64.tar.gz;
            sudo npm install -g n;
            sudo n stable;
            sudo npm install npm@latest -g
            "
        end
        
        #ncpabe.vm.provision "install_express-generator", type: :shell do |shell|
        #    shell.inline = "sudo npm install -g express-generator"
        #end

        ncpabe.vm.provision "test_npm_installation", type: :shell do |shell|
            shell.inline = "
            node -v;
            npm version;
            npm list -g;
            "
        end

        ncpabe.vm.provision "install_dependencies", type: :shell do |shell|
            shell.inline = "
            apt-get -y -q install build-essential;
            apt-get -y -q install wget;
            apt-get -y -q install m4;
            apt-get -y -q install flex bison;
            apt-get -y -q install libssl-dev;
            apt-get -y -q install gtk+-2.0;
            apt-get -y -q install libgmp-dev
            apt-get -y -q install lzip;
            apt-get -y -q install autoconf;
            apt-get -y -q install automake;
            apt-get -y -q install libtool;
            apt-get -y -q install valgrind;
            sudo npm install -g node-gyp
            "   
        end

        ncpabe.vm.provision "install_gmp", type: :shell do |shell|
            shell.inline = "
            wget https://gmplib.org/download/gmp/gmp-6.1.2.tar.lz;
            tar --lzip -xvf gmp-6.1.2.tar.lz;
            cd gmp-6.1.2;
            ./configure;
            make;
            make check;
            sudo make install;
            "
        end

        ncpabe.vm.provision "build_module", type: :shell do |shell|
           shell.inline = "
           cd /vagrant;
           node-gyp configure;
           node-gyp build;
           " 
        end

        ncpabe.vm.provision "test_build", type: :shell do |shell|
            shell.inline = "
            cd /vagrant
            cp build/Release/cpabe.node jssrc/;
            npm install;
            npm test;
            "
        end
    end
    
end
